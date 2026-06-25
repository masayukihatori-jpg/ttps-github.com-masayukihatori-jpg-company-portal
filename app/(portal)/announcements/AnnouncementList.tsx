"use client";

import { useState } from "react";
import Link from "next/link";
import { useEditMode } from "@/contexts/EditModeContext";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  category: string;
  organization: string;
  important: boolean;
  isDraft: boolean;
  slackSent: boolean;
  publishedAt: string;
}

export default function AnnouncementList({
  announcements,
  isAdmin,
}: {
  announcements: AnnouncementItem[];
  isAdmin?: boolean;
}) {
  const { isEditMode } = useEditMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    announcements.length > 0 ? announcements[0].id : null
  );

  const filtered = searchQuery.trim()
    ? announcements.filter((a) => {
        const q = searchQuery.toLowerCase();
        const plain = a.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
        return (
          a.title.toLowerCase().includes(q) ||
          plain.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.organization.toLowerCase().includes(q)
        );
      })
    : announcements;

  const selected = filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  if (announcements.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center text-[#AAAAAA]">
        <p className="text-4xl mb-3">📭</p>
        <p>お知らせはまだありません</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* ━━ 左：一覧 ━━ */}
      <div className="w-80 flex-shrink-0 flex flex-col min-h-0">
        {/* 検索ボックス */}
        <div className="relative mb-3 flex-shrink-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="キーワードで絞り込み..."
            className="w-full text-xs pl-8 pr-7 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0067B8] bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="text-[10px] text-gray-400 mb-2 flex-shrink-0">{filtered.length}件ヒット</p>
        )}
        <div className="overflow-y-auto space-y-2 pb-6 flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">一致するお知らせがありません</p>
        ) : filtered.map((item) => {
          const isSelected = item.id === selectedId;
          const displaySummary =
            item.summary ||
            item.content
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 80) + "…";

          return (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`w-full text-left px-4 py-3 rounded-2xl border transition-all ${
                isSelected
                  ? "border-[#0067B8] bg-[#F0F7FF] shadow-sm"
                  : item.important
                  ? "border-red-200 bg-white hover:shadow-sm"
                  : "border-[#EEEEEE] bg-white hover:shadow-sm"
              }`}
            >
              {/* 1行目：日付 + バッジ */}
              <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                <span className="text-xs text-[#AAAAAA] whitespace-nowrap">
                  {new Date(item.publishedAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {item.isDraft && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                    下書き
                  </span>
                )}
                {item.important && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                    🔴 重要
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                  {item.category}
                </span>
                {item.organization && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full whitespace-nowrap truncate">
                    {item.organization}
                  </span>
                )}
              </div>
              {/* 2行目：タイトル */}
              <p className={`text-sm font-semibold leading-snug mb-1 ${isSelected ? "text-[#0067B8]" : "text-[#192E61]"}`}>
                {item.title}
              </p>
              {/* 3行目：要約 */}
              <p className="text-xs text-[#AAAAAA] leading-relaxed line-clamp-2">{displaySummary}</p>
            </button>
          );
        })}
        </div>
      </div>

      {/* ━━ 右：詳細 ━━ */}
      <div className="flex-1 min-w-0 overflow-y-auto pb-6">
        {selected ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* ヘッダー：日付 + バッジ + 編集ボタン */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(selected.publishedAt).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                {selected.isDraft && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                    下書き
                  </span>
                )}
                {selected.important && (
                  <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-medium">
                    🔴 重要
                  </span>
                )}
                <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                  {selected.category}
                </span>
                {selected.organization && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                    {selected.organization}
                  </span>
                )}
                {selected.slackSent && (
                  <span className="text-xs bg-green-100 text-green-600 px-2.5 py-1 rounded-full">
                    💬 Slack通知済み
                  </span>
                )}
              </div>
              {isEditMode && (
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <Link
                    href={`/announcements/${selected.id}/edit`}
                    className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    編集
                  </Link>
                </div>
              )}
            </div>

            {/* タイトル */}
            <h1 className="text-2xl font-bold text-gray-900 mb-5">{selected.title}</h1>

            <div className="border-b border-gray-100 mb-5" />

            {/* 本文 */}
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed
                prose-headings:font-semibold prose-headings:text-gray-800
                prose-h2:text-base prose-h3:text-sm
                prose-a:text-[#0067B8] prose-a:underline
                prose-ul:list-disc prose-ul:pl-5
                prose-ol:list-decimal prose-ol:pl-5"
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full text-center text-gray-400 select-none">
            <div>
              <div className="text-5xl mb-4">📢</div>
              <p className="text-sm">左のリストからお知らせを選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
