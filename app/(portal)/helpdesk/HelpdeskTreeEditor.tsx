"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpdeskNodeFlat, HelpdeskNodeTree, buildTree } from "./types";

/* ─── 参照データ型 ───────────────────────────── */
interface ManualPageOption {
  id: string;
  title: string;
  categoryId: string;
  sectionId: string;
  displayName: string;
}

interface RegulationOption {
  id: string;
  name: string;
  displayName: string;
}

/* ─── 編集パネル ─────────────────────────────── */
interface EditPanelProps {
  node: HelpdeskNodeFlat;
  manualPages: ManualPageOption[];
  regulations: RegulationOption[];
  onSave: (data: {
    label: string;
    answerText: string;
    manualPageId: string | null;
    regulationId: string | null;
    nodeType: string;
    useAiAnswer: boolean;
  }) => Promise<void>;
  onClose: () => void;
}

// 回答タイプ（自由記載は廃止 → manual / regulation / ai の単一選択）
type ResponseType = "manual" | "regulation" | "ai";

function EditPanel({ node, manualPages, regulations, onSave, onClose }: EditPanelProps) {
  const [label, setLabel] = useState(node.label);
  const [manualPageId, setManualPageId] = useState(node.manualPageId ?? "");
  const [regulationId, setRegulationId] = useState(node.regulationId ?? "");
  const [nodeType, setNodeType] = useState(node.nodeType ?? "choice");
  const [saving, setSaving] = useState(false);

  // 回答タイプ（単一選択）
  // 入力フィールド(自由記載)ノードの場合は "ai" に固定
  const deriveType = (n: typeof node): ResponseType | null => {
    if (n.nodeType === "input") return "ai";
    if (n.manualPageId) return "manual";
    if (n.regulationId) return "regulation";
    if (n.useAiAnswer) return "ai";
    return null;
  };
  const [selectedType, setSelectedType] = useState<ResponseType | null>(() => deriveType(node));

  useEffect(() => {
    setLabel(node.label);
    setManualPageId(node.manualPageId ?? "");
    setRegulationId(node.regulationId ?? "");
    const nt = node.nodeType ?? "choice";
    setNodeType(nt);
    setSelectedType(deriveType(node));
  }, [node.id, node.label, node.answerText, node.manualPageId, node.regulationId, node.nodeType, node.useAiAnswer]); // eslint-disable-line

  // nodeType 変更時に回答タイプを連動
  const handleNodeTypeChange = (nt: string) => {
    setNodeType(nt);
    if (nt === "input") {
      // 自由記載ノード → AI を自動設定
      setSelectedType("ai");
    } else if (selectedType === "ai") {
      // 自由記載以外では AI は使えない → クリア
      setSelectedType(null);
    }
  };

  // 回答タイプ選択（入力フィールドノードでは操作不可）
  const handleSelectType = (t: ResponseType) => {
    if (nodeType === "input") return; // 自由記載ノードは AI 固定
    setSelectedType((prev) => {
      if (prev === t) {
        // 同じを押したら解除
        if (t === "manual") setManualPageId("");
        if (t === "regulation") setRegulationId("");
        return null;
      }
      // 切り替え時に古い選択をクリア
      if (t !== "manual") setManualPageId("");
      if (t !== "regulation") setRegulationId("");
      return t;
    });
  };

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    await onSave({
      label: label.trim(),
      answerText: "", // 自由記載は廃止
      manualPageId: selectedType === "manual" ? manualPageId || null : null,
      regulationId: selectedType === "regulation" ? regulationId || null : null,
      nodeType,
      useAiAnswer: selectedType === "ai",
    });
    setSaving(false);
  };

  const typeConfig: { type: ResponseType; icon: string; label: string; desc: string }[] = [
    { type: "manual",     icon: "📄", label: "マニュアルページ", desc: "マニュアルの該当ページへリンク" },
    { type: "regulation", icon: "📋", label: "規程PDF",          desc: "規程ファイルへリンク" },
    { type: "ai",         icon: "✨", label: "AIで回答",         desc: "規程・マニュアルを参照して自動回答" },
  ];

  return (
    <div className="w-84 shrink-0 bg-white border border-gray-200 rounded-xl self-start sticky top-4 overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800 text-sm">ノードを編集</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">

        {/* ── 基本設定 ── */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">基本設定</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                選択肢テキスト <span className="text-red-500">*</span>
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="例：労務・人事について"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">ノードタイプ</label>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${nodeType === "choice" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input
                    type="radio"
                    name="nodeType"
                    value="choice"
                    checked={nodeType === "choice"}
                    onChange={() => handleNodeTypeChange("choice")}
                    className="mt-0.5 text-blue-600"
                  />
                  <span>
                    <span className={`text-sm font-semibold block ${nodeType === "choice" ? "text-blue-800" : "text-gray-700"}`}>選択肢</span>
                    <span className="text-xs text-gray-400">クリックして次の階層へ進む</span>
                  </span>
                </label>
                <label className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors ${nodeType === "input" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input
                    type="radio"
                    name="nodeType"
                    value="input"
                    checked={nodeType === "input"}
                    onChange={() => handleNodeTypeChange("input")}
                    className="mt-0.5 text-blue-600"
                  />
                  <span>
                    <span className={`text-sm font-semibold block ${nodeType === "input" ? "text-blue-800" : "text-gray-700"}`}>入力フィールド</span>
                    <span className="text-xs text-gray-400">フォームとして複数同時表示</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* ── 回答コンテンツ ── */}
        <section>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">回答コンテンツ</p>
          <p className="text-xs text-gray-400 mb-3">
            {nodeType === "input"
              ? "自由記載ノードはAIで回答が自動設定されます。"
              : "末端ノードで表示する内容（1つ選択）。"}
          </p>

          <div className="space-y-3">
            {typeConfig.map(({ type, icon, label: typeLabel, desc }) => {
              const selected = selectedType === type;
              // AIで回答は自由記載ノード専用
              const disabled = type === "ai" && nodeType !== "input";
              // 自由記載ノードでは AI 以外を操作不可
              const locked = nodeType === "input" && type === "ai";

              return (
                <div
                  key={type}
                  className={`rounded-xl border-2 transition-colors ${
                    disabled
                      ? "border-gray-100 bg-gray-50 opacity-40"
                      : selected
                        ? "border-blue-400 bg-blue-50"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  {/* タイプ選択ヘッダー */}
                  <button
                    type="button"
                    onClick={() => !disabled && handleSelectType(type)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="flex-1">
                      <span className={`text-sm font-semibold block ${selected ? "text-blue-800" : "text-gray-700"}`}>
                        {typeLabel}
                        {locked && <span className="ml-2 text-[10px] font-normal text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">自動</span>}
                      </span>
                      <span className="text-xs text-gray-400">{desc}</span>
                    </span>
                    {/* ラジオボタン表示 */}
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    }`}>
                      {selected && <span className="w-2 h-2 rounded-full bg-white block" />}
                    </span>
                  </button>

                  {/* コンテンツ入力（選択時のみ） */}
                  {selected && (
                    <div className="px-4 pb-4">
                      {type === "manual" && (
                        <select
                          value={manualPageId}
                          onChange={(e) => setManualPageId(e.target.value)}
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        >
                          <option value="">ページを選択...</option>
                          {manualPages.map((p) => (
                            <option key={p.id} value={p.id}>{p.displayName}</option>
                          ))}
                        </select>
                      )}
                      {type === "regulation" && (
                        <select
                          value={regulationId}
                          onChange={(e) => setRegulationId(e.target.value)}
                          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        >
                          <option value="">規程を選択...</option>
                          {regulations.map((r) => (
                            <option key={r.id} value={r.id}>{r.displayName}</option>
                          ))}
                        </select>
                      )}
                      {type === "ai" && (
                        <div className="space-y-1 text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2.5 leading-relaxed">
                          <p className="font-semibold">✨ Claude AIが自動で回答します</p>
                          <p className="text-blue-500">ユーザーが入力した内容をもとに社内資料を自動検索して回答します。</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* フッター */}
      <div className="flex gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50">
        <button
          onClick={handleSave}
          disabled={saving || !label.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

/* ─── ツリーノード行 ─────────────────────────── */
interface TreeNodeRowProps {
  node: HelpdeskNodeTree;
  editingId: string | undefined;
  expandedIds: Set<string>;
  onEdit: (node: HelpdeskNodeTree) => void;
  onAdd: (parentId: string, parentDepth: number) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

function TreeNodeRow({
  node,
  editingId,
  expandedIds,
  onEdit,
  onAdd,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: TreeNodeRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isEditing = editingId === node.id;
  const isLeaf = !hasChildren;

  const depthColors = [
    "border-l-blue-400",
    "border-l-violet-400",
    "border-l-emerald-400",
    "border-l-amber-400",
    "border-l-rose-400",
  ];
  const borderColor = depthColors[node.depth % depthColors.length];

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2.5 rounded-lg border-l-2 ${borderColor} ${
          isEditing ? "bg-blue-50 ring-1 ring-blue-300" : "bg-white hover:bg-gray-50"
        } group transition-colors`}
        style={{ marginLeft: `${node.depth * 20}px` }}
      >
        {/* 展開/折りたたみ */}
        <button
          onClick={() => hasChildren && onToggle(node.id)}
          className={`w-5 h-5 flex items-center justify-center text-gray-400 text-xs ${
            hasChildren ? "hover:text-gray-700 cursor-pointer" : "cursor-default"
          }`}
        >
          {hasChildren ? (isExpanded ? "▼" : "▶") : "•"}
        </button>

        {/* ラベル */}
        <span className="flex-1 text-sm font-medium text-gray-800 min-w-0 truncate">
          {node.label}
        </span>

        {/* リーフバッジ */}
        {isLeaf && (
          <span className="shrink-0 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            葉
          </span>
        )}

        {/* 操作ボタン（ホバー時表示） */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => !isFirst && onMoveUp(node.id)}
            disabled={isFirst}
            title="上へ"
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
          >
            ↑
          </button>
          <button
            onClick={() => !isLast && onMoveDown(node.id)}
            disabled={isLast}
            title="下へ"
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
          >
            ↓
          </button>
          <button
            onClick={() => onEdit(node)}
            title="編集"
            className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded transition-colors"
          >
            編集
          </button>
          {node.depth < 9 && (
            <button
              onClick={() => onAdd(node.id, node.depth)}
              title="子ノードを追加"
              className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-green-100 hover:text-green-700 rounded transition-colors"
            >
              + 追加
            </button>
          )}
          <button
            onClick={() => onDelete(node.id)}
            title="削除"
            className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-red-100 hover:text-red-700 rounded transition-colors"
          >
            削除
          </button>
        </div>
      </div>

      {/* 子ノード */}
      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {node.children.map((child, i) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              editingId={editingId}
              expandedIds={expandedIds}
              onEdit={onEdit}
              onAdd={onAdd}
              onDelete={onDelete}
              onToggle={onToggle}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              isFirst={i === 0}
              isLast={i === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── メインエディタ ──────────────────────────── */
export default function HelpdeskTreeEditor() {
  const [nodes, setNodes] = useState<HelpdeskNodeFlat[]>([]);
  const [tree, setTree] = useState<HelpdeskNodeTree[]>([]);
  const [editingNode, setEditingNode] = useState<HelpdeskNodeFlat | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [manualPages, setManualPages] = useState<ManualPageOption[]>([]);
  const [regulations, setRegulations] = useState<RegulationOption[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data: HelpdeskNodeFlat[] = await fetch("/api/helpdesk/nodes").then((r) => r.json());
    setNodes(data);
    setTree(buildTree(data));
    return data;
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/helpdesk/nodes").then((r) => { if (!r.ok) throw new Error(`nodes ${r.status}`); return r.json(); }),
      fetch("/api/manual/categories").then((r) => r.ok ? r.json() : []),
      fetch("/api/regulations").then((r) => r.ok ? r.json() : []),
    ]).then(([nodeData, catData, regCatData]) => {
      setNodes(Array.isArray(nodeData) ? nodeData : []);
      setTree(buildTree(Array.isArray(nodeData) ? nodeData : []));

      // マニュアルページをフラット化
      const pages: ManualPageOption[] = [];
      for (const cat of (catData ?? [])) {
        for (const sec of cat.sections ?? []) {
          for (const page of sec.pages ?? []) {
            pages.push({
              id: page.id,
              title: page.title,
              categoryId: cat.id,
              sectionId: sec.id,
              displayName: `${cat.name} › ${sec.name} › ${page.title}`,
            });
          }
        }
      }
      setManualPages(pages);

      // 規程をフラット化
      const regs: RegulationOption[] = [];
      for (const cat of (regCatData ?? [])) {
        for (const reg of cat.regulations ?? []) {
          regs.push({ id: reg.id, name: reg.name, displayName: `${cat.name} › ${reg.name}` });
        }
      }
      setRegulations(regs);
      setLoading(false);
    }).catch((e) => {
      console.error("HelpdeskTreeEditor load error:", e);
      setLoading(false);
    });
  }, []);

  const addNode = async (parentId: string | null, parentDepth: number) => {
    const siblings = nodes.filter((n) => n.parentId === parentId);
    const maxOrder = siblings.reduce((m, n) => Math.max(m, n.order), -1);
    const res = await fetch("/api/helpdesk/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: "新しい選択肢",
        parentId,
        depth: parentDepth + 1,
        order: maxOrder + 1,
      }),
    });
    const newNode: HelpdeskNodeFlat = await res.json();
    const updated = await reload();
    setEditingNode(newNode);
    // 親を展開
    if (parentId) setExpandedIds((prev) => new Set([...prev, parentId]));
    // 新しいノードの親ノードも展開
    const parentNode = updated.find((n) => n.id === parentId);
    if (parentNode?.parentId) {
      setExpandedIds((prev) => new Set([...prev, parentNode.parentId!]));
    }
  };

  const saveNode = async (
    id: string,
    data: {
      label: string;
      answerText: string;
      manualPageId: string | null;
      regulationId: string | null;
      nodeType: string;
      useAiAnswer: boolean;
    }
  ) => {
    await fetch(`/api/helpdesk/nodes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await reload();
    setEditingNode(null);
  };

  const deleteNode = async (id: string) => {
    const node = nodes.find((n) => n.id === id);
    const childCount = nodes.filter((n) => {
      // 子孫かどうかは再帰的に確認する必要があるが、簡易的にchildrenを確認
      return n.parentId === id;
    }).length;
    const message =
      childCount > 0
        ? `「${node?.label}」とその子ノード（${childCount}件以上）を削除しますか？`
        : `「${node?.label}」を削除しますか？`;
    if (!confirm(message)) return;
    await fetch(`/api/helpdesk/nodes/${id}`, { method: "DELETE" });
    await reload();
    if (editingNode?.id === id) setEditingNode(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(nodes.map((n) => n.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const swapOrder = async (idA: string, idB: string) => {
    const a = nodes.find((n) => n.id === idA)!;
    const b = nodes.find((n) => n.id === idB)!;
    await Promise.all([
      fetch(`/api/helpdesk/nodes/${idA}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/helpdesk/nodes/${idB}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);
    await reload();
  };

  const moveUp = (id: string) => {
    const node = nodes.find((n) => n.id === id)!;
    const siblings = nodes
      .filter((n) => n.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((n) => n.id === id);
    if (idx > 0) swapOrder(id, siblings[idx - 1].id);
  };

  const moveDown = (id: string) => {
    const node = nodes.find((n) => n.id === id)!;
    const siblings = nodes
      .filter((n) => n.parentId === node.parentId)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((n) => n.id === id);
    if (idx < siblings.length - 1) swapOrder(id, siblings[idx + 1].id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20 text-gray-400 text-sm animate-pulse">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">
      {/* ツリーパネル */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <button onClick={expandAll} className="hover:text-gray-800 underline">
              すべて展開
            </button>
            <span>|</span>
            <button onClick={collapseAll} className="hover:text-gray-800 underline">
              すべて折りたたむ
            </button>
          </div>
          <button
            onClick={() => addNode(null, -1)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            + ルートノードを追加
          </button>
        </div>

        {tree.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl">
            <p>まだノードがありません。</p>
            <p className="mt-1">ルートノードを追加してツリーを作成してください。</p>
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((node, i) => (
              <TreeNodeRow
                key={node.id}
                node={node}
                editingId={editingNode?.id}
                expandedIds={expandedIds}
                onEdit={(n) => setEditingNode(nodes.find((x) => x.id === n.id) ?? null)}
                onAdd={addNode}
                onDelete={deleteNode}
                onToggle={toggleExpand}
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                isFirst={i === 0}
                isLast={i === tree.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* 編集パネル */}
      {editingNode && (
        <EditPanel
          node={editingNode}
          manualPages={manualPages}
          regulations={regulations}
          onSave={(data) => saveNode(editingNode.id, data)}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  );
}
