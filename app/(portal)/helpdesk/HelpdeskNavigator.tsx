"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditMode } from "@/contexts/EditModeContext";
import { HelpdeskNodeFlat, HelpdeskNodeTree, buildTree } from "./types";

export default function HelpdeskNavigator() {
  const { isEditMode } = useEditMode();
  const [tree, setTree] = useState<HelpdeskNodeTree[]>([]);
  const [path, setPath] = useState<HelpdeskNodeTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ label: string; value: string }[] | null>(null);

  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchNodes = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/api/helpdesk/nodes")
      .then(async (r) => {
        if (!r.ok) { const b = await r.text(); throw new Error(`HTTP ${r.status}: ${b}`); }
        return r.json();
      })
      .then((nodes: unknown) => {
        setTree(buildTree(Array.isArray(nodes) ? (nodes as HelpdeskNodeFlat[]) : []));
        setLoading(false);
      })
      .catch((err: Error) => {
        setErrorDetail(err.message); setError(true); setLoading(false);
      });
  }, []);

  useEffect(() => { fetchNodes(); }, [fetchNodes]);
  useEffect(() => { if (!isEditMode) fetchNodes(); }, [isEditMode, fetchNodes]);

  const currentNode = path.length > 0 ? path[path.length - 1] : null;
  const currentChildren = currentNode ? currentNode.children : tree;
  const isLeaf = currentNode !== null && currentNode.children.length === 0;

  const isFormMode = currentChildren.some((n) => n.nodeType === "input");
  const inputNodes = currentChildren.filter((n) => n.nodeType === "input");
  const choiceNodes = currentChildren.filter((n) => n.nodeType === "choice");
  // 選択中のノードが input タイプかどうか
  const selectedIsInput = inputNodes.some((n) => n.id === selectedChoiceId);
  // 有効判定: choiceが選択されている OR inputが選択されていてテキストが入力されている
  const formValid = selectedChoiceId !== null &&
    (choiceNodes.some((n) => n.id === selectedChoiceId) ||
     (selectedIsInput && (inputValues[selectedChoiceId] ?? "").trim() !== ""));

  const clearAi = () => { setAiAnswer(null); setAiLoading(false); setAiError(null); };

  const select = (node: HelpdeskNodeTree) => {
    setPath([...path, node]);
    setInputValues({}); setSelectedChoiceId(null); setSummary(null); clearAi();
  };
  const goTo = (index: number) => {
    setPath(path.slice(0, index + 1));
    setInputValues({}); setSelectedChoiceId(null); setSummary(null); clearAi();
  };
  const reset = () => {
    setPath([]); setInputValues({}); setSelectedChoiceId(null); setSummary(null); clearAi();
  };

  const generateAiAnswer = async (
    node: HelpdeskNodeTree,
    overridePathLabels?: string[],
    overrideUserInputs?: { label: string; value: string }[],
  ) => {
    setAiLoading(true); setAiAnswer(null); setAiError(null);
    try {
      const pathLabels = overridePathLabels ?? (() => {
        const labels = [...path.map((n) => n.label)];
        if (!labels.includes(node.label)) labels.push(node.label);
        return labels;
      })();
      const userInputsToSend = overrideUserInputs !== undefined
        ? overrideUserInputs
        : (Object.keys(inputValues).length > 0
            ? Object.entries(inputValues).map(([id, value]) => ({
                label: currentChildren.find((n) => n.id === id)?.label ?? id, value,
              }))
            : undefined);
      const res = await fetch("/api/helpdesk/ai-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: node.id, pathLabels,
          userInputs: userInputsToSend,
        }),
      });
      if (!res.ok || !res.body) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`); }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setAiAnswer(accumulated);
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI回答の取得に失敗しました");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = () => {
    if (!selectedChoiceId) return;
    const choiceNode = choiceNodes.find((n) => n.id === selectedChoiceId);
    if (choiceNode) {
      // 選択肢ノードへ進む
      setPath([...path, choiceNode]); setInputValues({}); setSelectedChoiceId(null); setSummary(null);
    } else if (selectedIsInput) {
      // input ノードが選択されている → パスに追加してAI自動生成
      const inputNode = inputNodes.find((n) => n.id === selectedChoiceId);
      if (!inputNode) return;
      const userText = inputValues[selectedChoiceId] ?? "";
      const newPath = [...path, inputNode];
      setPath(newPath);
      setSummary([{ label: inputNode.label, value: userText }]);
      setSelectedChoiceId(null);
      // AI自動生成
      const newPathLabels = newPath.map((n) => n.label);
      const userInputsForAi = userText.trim() ? [{ label: inputNode.label, value: userText }] : undefined;
      generateAiAnswer(inputNode, newPathLabels, userInputsForAi);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-32 text-gray-400"><span className="animate-pulse">読み込み中...</span></div>;
  if (error) return (
    <div className="p-4 text-red-700 bg-red-50 rounded-xl text-sm space-y-1">
      <p className="font-semibold">データの読み込みに失敗しました</p>
      {errorDetail && <pre className="text-xs text-red-500 whitespace-pre-wrap break-all bg-red-100 p-2 rounded">{errorDetail}</pre>}
    </div>
  );
  if (tree.length === 0) return (
    <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
      <p className="text-sm">ヘルプデスクの案内がまだ設定されていません。</p>
    </div>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2カラムレイアウト
  // 左1/3: ナビゲーション（選択 or パス表示）
  // 右2/3: 回答（リーフ到達時のみ）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="flex gap-6 items-start min-h-[400px]">

      {/* ━━ 左カラム（1/3）: ナビゲーション ━━ */}
      <div className="w-1/3 flex-shrink-0 space-y-3">

        {/* パンくず */}
        {path.length > 0 && (
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            <button onClick={reset} className="text-[#0067B8] hover:underline font-medium">トップ</button>
            {path.map((node, i) => (
              <span key={node.id} className="flex items-center gap-1">
                <span className="text-gray-400">›</span>
                {i < path.length - 1 ? (
                  <button onClick={() => goTo(i)} className="text-[#0067B8] hover:underline text-xs">{node.label}</button>
                ) : (
                  <span className="text-gray-700 font-semibold text-xs">{node.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* ── リーフ到達時: 選択したパスを一覧表示 ── */}
        {(isLeaf || summary) ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">選択した内容</p>
            <div className="space-y-1.5">
              {path.map((node, i) => (
                <div key={node.id} className="flex items-start gap-2">
                  <span className="text-[#0067B8] text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <button
                    onClick={() => goTo(i)}
                    className="text-sm text-gray-700 hover:text-[#0067B8] text-left hover:underline"
                  >
                    {node.label}
                  </button>
                </div>
              ))}
              {summary && summary.map((entry) => (
                <div key={entry.label} className="flex gap-2 text-sm pl-4">
                  <span className="text-gray-500 flex-shrink-0">{entry.label}:</span>
                  <span className="text-gray-800 break-all">{entry.value}</span>
                </div>
              ))}
            </div>
            <button onClick={reset} className="text-xs text-[#0067B8] hover:underline mt-2 inline-block">
              ← 最初からやり直す
            </button>
          </div>
        ) : isFormMode ? (
          /* ── フォームモード：choice も input もすべてボタン、1択 ── */
          <div className="space-y-2">
            {currentNode?.question && (
              <p className="text-sm font-semibold text-gray-700 mb-1">{currentNode.question}</p>
            )}
            <p className="text-sm text-gray-500 mb-2">選択してください</p>

            {currentChildren.map((node) => {
              const isSelected = selectedChoiceId === node.id;
              const isInputType = node.nodeType === "input";
              return (
                <div key={node.id}>
                  {/* 選択ボタン（choice も input も同じ見た目） */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChoiceId(node.id);
                      // 別の選択肢を選んだら入力値をリセット
                      if (!isInputType) setInputValues({});
                    }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? "border-[#0067B8] bg-blue-50"
                        : "border-gray-200 hover:border-blue-300 bg-white"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      isSelected ? "border-[#0067B8]" : "border-gray-300"
                    }`}>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-[#0067B8]" />}
                    </span>
                    <span className="text-sm font-medium text-gray-800">{node.label}</span>
                  </button>

                  {/* input タイプが選択されたらテキストフィールドを展開 */}
                  {isSelected && isInputType && (
                    <div className="mt-1.5 pl-2">
                      <input
                        autoFocus
                        type="text"
                        value={inputValues[node.id] ?? ""}
                        onChange={(e) => setInputValues({ [node.id]: e.target.value })}
                        className="w-full border border-[#0067B8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067B8]"
                        placeholder="内容を入力してください"
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleFormSubmit} disabled={!formValid}
                className="bg-[#0067B8] hover:bg-[#005a9e] disabled:bg-blue-200 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                次へ
              </button>
              {path.length > 0 && (
                <button onClick={() => setPath(path.slice(0, -1))} className="text-xs text-gray-500 hover:text-gray-700">
                  ← 戻る
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── 通常の選択肢モード ── */
          <div className="space-y-2">
            {path.length === 0 && (
              <p className="text-sm font-semibold text-gray-700 mb-1">何についてお調べですか？</p>
            )}
            {currentChildren.map((node) => {
              const isNextLeaf = node.children.length === 0;
              return (
                <button
                  key={node.id}
                  onClick={() => select(node)}
                  className="w-full text-left flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-[#0067B8] hover:bg-blue-50 transition-colors shadow-sm group"
                >
                  <span className="text-sm font-medium text-gray-800">{node.label}</span>
                  <span className="text-xs text-gray-400 group-hover:text-[#0067B8] ml-2 shrink-0">
                    {isNextLeaf ? "→" : "▶"}
                  </span>
                </button>
              );
            })}
            {path.length > 0 && (
              <button onClick={() => setPath(path.slice(0, -1))} className="text-xs text-gray-500 hover:text-gray-700 pt-1 inline-block">
                ← 戻る
              </button>
            )}
          </div>
        )}
      </div>

      {/* ━━ 右カラム（2/3）: 回答エリア ━━ */}
      <div className="flex-1 min-w-0">
        {isLeaf && currentNode ? (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">
              {currentNode.label}
            </h2>

            {currentNode.answerText && (
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {currentNode.answerText}
              </p>
            )}

            {currentNode.manualPage && (
              <a
                href={`/manual/${currentNode.manualPage.section.category.id}/${currentNode.manualPage.section.id}/${currentNode.manualPage.id}`}
                className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-200 hover:border-[#0067B8] hover:shadow-sm transition-all group"
              >
                <span className="text-2xl mt-0.5">📄</span>
                <span>
                  <span className="text-xs text-gray-400 font-medium block mb-0.5">
                    {currentNode.manualPage.section.category.name} › {currentNode.manualPage.section.name}
                  </span>
                  <span className="text-[#0067B8] font-semibold group-hover:underline">
                    {currentNode.manualPage.title}
                  </span>
                </span>
              </a>
            )}

            {currentNode.regulation && (
              <a
                href={currentNode.regulation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-200 hover:border-[#0067B8] hover:shadow-sm transition-all group"
              >
                <span className="text-2xl mt-0.5">📋</span>
                <span>
                  <span className="text-xs text-gray-400 font-medium block mb-0.5">
                    規程 › {currentNode.regulation.category.name}
                  </span>
                  <span className="text-[#0067B8] font-semibold group-hover:underline">
                    {currentNode.regulation.name}
                  </span>
                </span>
              </a>
            )}

            {/* AI回答 */}
            {currentNode.useAiAnswer && (
              <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-100">
                  <span className="text-base">✨</span>
                  <span className="text-sm font-semibold text-purple-800">AIが回答します</span>
                  <span className="text-xs text-purple-400 ml-auto">Claude</span>
                </div>
                <div className="p-4">
                  {!aiAnswer && !aiLoading && !aiError && (
                    <div className="flex flex-col items-start gap-3">
                      <p className="text-xs text-gray-500">社内マニュアル・規程を参照して自動回答します。</p>
                      <button onClick={() => generateAiAnswer(currentNode)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                        <span>✨</span> AIに回答してもらう
                      </button>
                    </div>
                  )}
                  {aiLoading && (
                    <div className="flex items-center gap-2 text-sm text-purple-600">
                      <span className="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      <span className="animate-pulse">AIが回答を生成中...</span>
                    </div>
                  )}
                  {aiAnswer && (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{aiAnswer}</div>
                      <button onClick={() => generateAiAnswer(currentNode)}
                        className="text-xs text-purple-500 hover:text-purple-700 underline">再生成する</button>
                    </div>
                  )}
                  {aiError && (
                    <div className="text-xs text-red-600 bg-red-50 rounded-lg p-3">
                      <p className="font-semibold mb-1">AIの回答取得に失敗しました</p>
                      <p className="text-red-400">{aiError}</p>
                      <button onClick={() => generateAiAnswer(currentNode)}
                        className="mt-2 text-red-500 hover:text-red-700 underline">再試行</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!currentNode.answerText && !currentNode.manualPage && !currentNode.regulation && !currentNode.useAiAnswer && (
              <p className="text-gray-400 text-sm">この項目にはまだ回答が設定されていません。</p>
            )}
          </div>
        ) : summary ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-bold text-green-900">入力内容</h2>
            <dl className="space-y-2">
              {summary.map((entry) => (
                <div key={entry.label} className="flex gap-2 text-sm">
                  <dt className="font-medium text-gray-700 shrink-0">{entry.label}:</dt>
                  <dd className="text-gray-800 break-all">{entry.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          /* 未選択時のプレースホルダー */
          <div className="h-full flex items-center justify-center text-gray-300">
            <div className="text-center space-y-2">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto opacity-40">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p className="text-sm">左から項目を選択すると<br/>回答がここに表示されます</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
