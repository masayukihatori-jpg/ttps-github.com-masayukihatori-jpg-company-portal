"use client";

import { useState } from "react";

export type LogRow = {
  id: string;
  createdAt: string; // ISO string
  userName: string;
  pathLabels: string[];
  userInputs: { label: string; value: string }[];
  contextRegs: string[];
  contextPages: string[];
  aiAnswer: string | null;
};

function formatDate(iso: string) {
  const dt = new Date(iso);
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

/* ── AI回答モーダル ── */
function AnswerModal({ answer, onClose }: { answer: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEE]">
          <h2 className="text-sm font-semibold text-[#192E61]">AI回答（全文）</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  );
}

export default function HelpdeskLogTable({ logs }: { logs: LogRow[] }) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  /* CSV ダウンロード */
  const handleExportCsv = () => {
    const headers = ["日時", "ユーザー", "質問経路", "入力内容", "参照資料（規程）", "参照資料（マニュアル）", "AI回答"];
    const rows = logs.map((log) => [
      formatDate(log.createdAt),
      log.userName,
      log.pathLabels.join(" > "),
      log.userInputs.map((i) => i.value).join(" / "),
      log.contextRegs.join(" / "),
      log.contextPages.join(" / "),
      log.aiAnswer ?? "",
    ]);

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const bom = "﻿"; // Excel用BOM
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `helpdesk-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {selectedAnswer && (
        <AnswerModal answer={selectedAnswer} onClose={() => setSelectedAnswer(null)} />
      )}

      {/* ヘッダーアクション */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{logs.length} 件</p>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0067B8] border border-[#0067B8] rounded-lg hover:bg-blue-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          CSVエクスポート
        </button>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-xl shadow-sm border border-[#DDDDDD] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F7FA] border-b border-[#EEEEEE]">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#888888] w-36">日時</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#888888] w-24">ユーザー</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#888888]">質問経路</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#888888] w-36">入力内容</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#888888] w-44">参照資料</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#888888] w-28">AI回答</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F0F0]">
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  まだ履歴がありません
                </td>
              </tr>
            )}
            {logs.map((log) => {
              const refs = [...log.contextRegs, ...log.contextPages];
              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                    {log.userName}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {log.pathLabels.join(" › ")}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {log.userInputs.length > 0
                      ? log.userInputs.map((i) => i.value).join(", ")
                      : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700">
                    {refs.length > 0 ? (
                      <ul className="space-y-0.5">
                        {refs.map((r, i) => (
                          <li key={i} className="truncate max-w-[160px]" title={r}>{r}</li>
                        ))}
                      </ul>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.aiAnswer ? (
                      <button
                        onClick={() => setSelectedAnswer(log.aiAnswer!)}
                        className="text-[#0067B8] hover:underline text-left"
                      >
                        全文を見る
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
