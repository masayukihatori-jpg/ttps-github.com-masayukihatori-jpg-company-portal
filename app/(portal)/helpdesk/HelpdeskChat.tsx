"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { type: "manual" | "regulation"; title: string; path?: string }[];
}

const EXAMPLE_QUESTIONS = [
  "有給休暇の申請方法を教えてください",
  "経費精算の手順は？",
  "テレワーク時のセキュリティルールは？",
  "新入社員の受け入れ手順を確認したい",
];

export default function HelpdeskChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (question?: string) => {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/helpdesk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "エラーが発生しました。しばらくしてから再度お試しください。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 説明 */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(54deg, #0061b3 0%, #0089d0 100%)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.8"/>
              <path d="M12 16v-4M12 8h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#192E61]">社内ヘルプデスク AI</p>
            <p className="text-xs text-[#888888] mt-0.5">
              マニュアル・規程を参照して質問に回答します。気になることを何でも聞いてください。
            </p>
          </div>
        </div>
      </div>

      {/* チャット履歴 */}
      {messages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#EEEEEE] p-6">
          <p className="text-xs font-medium text-[#AAAAAA] mb-3">よくある質問</p>
          <div className="grid grid-cols-1 gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-left text-sm text-[#0067B8] bg-[#E2EDF5]/60 hover:bg-[#E2EDF5] px-4 py-2.5 rounded-xl transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                  style={{ background: "linear-gradient(54deg, #0061b3 0%, #0089d0 100%)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                    <path d="M12 16v-4M12 8h.01" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
              )}
              <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : ""}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[#0067B8] text-white rounded-br-sm"
                    : "bg-white border border-[#EEEEEE] text-[#192E61] rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>

                {/* 参照元 */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-[#AAAAAA] ml-1">参照元：</p>
                    {msg.sources.slice(0, 5).map((s, j) => (
                      <div key={j} className="flex items-center gap-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                          s.type === "manual"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-red-50 text-red-500"
                        }`}>
                          {s.type === "manual" ? "マニュアル" : "規程"}
                        </span>
                        {s.path ? (
                          <Link href={s.path} className="text-xs text-[#0067B8] hover:underline truncate">
                            {s.title}
                          </Link>
                        ) : (
                          <span className="text-xs text-[#888888] truncate">{s.title}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2"
                style={{ background: "linear-gradient(54deg, #0061b3 0%, #0089d0 100%)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                  <path d="M12 16v-4M12 8h.01" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="bg-white border border-[#EEEEEE] rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-[#AAAAAA] rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* 入力欄 */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] p-3 sticky bottom-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="質問を入力してください..."
            disabled={loading}
            className="flex-1 text-sm outline-none text-[#192E61] placeholder-[#CCCCCC] disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-[#0067B8] hover:bg-[#005a9e] disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
