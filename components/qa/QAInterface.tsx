"use client";

import { useState } from "react";

export default function QAInterface({ userId }: { userId: string }) {
  const [step, setStep] = useState<"input" | "answer" | "followup" | "success" | "error">("input");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [followUpHistory, setFollowUpHistory] = useState<Array<{q: string, a: string}>>([]);
  const [followUpInput, setFollowUpInput] = useState("");

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/qa/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, userId }),
      });

      const data = await res.json();
      if (res.ok && data.answer) {
        setAnswer(data.answer);
        setQuestionId(data.question.id);
        setStep("answer");
      } else {
        setError(data.error || "エラーが発生しました");
        setStep("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUp = async () => {
    if (!followUpInput.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/qa/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          followUpQuestion: followUpInput,
          feedback: "not_understood",
          userId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFollowUpHistory([...followUpHistory, { q: followUpInput, a: data.followUpAnswer }]);
        setFollowUpInput("");

        if (data.escalated) {
          setStep("success");
        } else {
          setStep("followup");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラー");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("input");
    setQuestion("");
    setAnswer("");
    setFollowUpHistory([]);
    setFollowUpInput("");
    setQuestionId("");
  };

  // 入力画面
  if (step === "input") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-2">💬 マニュアル検索・Q&A</h2>
        <p className="text-sm text-gray-600 mb-4">社内規程やマニュアルについてAIに質問できます。</p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="例：育休の取得条件を教えてください"
          className="w-full p-3 border border-gray-300 rounded-lg mb-3"
          rows={3}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "生成中..." : "質問する"}
        </button>
      </div>
    );
  }

  // 回答画面
  if (step === "answer" || step === "followup") {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm font-semibold mb-1">最初の質問</p>
          <p>{question}</p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <p className="text-sm font-semibold mb-1">AI回答</p>
          <p className="whitespace-pre-wrap">{answer}</p>
        </div>

        {followUpHistory.map((item, i) => (
          <div key={i} className="border-l-4 border-purple-500 pl-4 space-y-2">
            <div className="bg-purple-50 p-4 rounded">
              <p className="text-sm font-semibold mb-1">追加質問 {i + 1}</p>
              <p>{item.q}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <p className="text-sm font-semibold mb-1">追加回答 {i + 1}</p>
              <p className="whitespace-pre-wrap">{item.a}</p>
            </div>
          </div>
        ))}

        {step === "answer" && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setStep("success")}
                className="flex-1 bg-green-600 text-white py-2 rounded"
              >
                ✓ 解決した
              </button>
              <button
                onClick={() => setStep("followup")}
                className="flex-1 bg-orange-600 text-white py-2 rounded"
              >
                ⚠️ 分からない
              </button>
            </div>
          </div>
        )}

        {step === "followup" && (
          <div className="space-y-2">
            <textarea
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              placeholder="追加で確認したい点を入力してください"
              className="w-full p-3 border border-gray-300 rounded"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleFollowUp}
                disabled={loading || !followUpInput.trim()}
                className="flex-1 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
              >
                {loading ? "生成中..." : "追加説明を求める"}
              </button>
              <button
                onClick={() => setStep("success")}
                className="flex-1 bg-green-600 text-white py-2 rounded"
              >
                ✓ 解決した
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 成功画面
  if (step === "success") {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-6 text-center">
        <p className="text-lg font-semibold text-green-900 mb-4">✓ ご質問ありがとうございました</p>
        <button
          onClick={reset}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          新しい質問をする
        </button>
      </div>
    );
  }

  // エラー画面
  return (
    <div className="bg-red-50 rounded-lg border border-red-200 p-6">
      <p className="text-red-700 mb-4">{error}</p>
      <button onClick={reset} className="bg-blue-600 text-white px-4 py-2 rounded">
        戻る
      </button>
    </div>
  );
}
