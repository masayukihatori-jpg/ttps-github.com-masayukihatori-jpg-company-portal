"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEditMode } from "@/contexts/EditModeContext";

interface Page {
  id: string;
  slug: string;
  title: string;
  hasContent: boolean;
}

interface Props {
  sectionSlug: string;
  sectionName: string;
  pages: Page[];
}

export default function ContentSectionNav({ sectionSlug, sectionName, pages }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin: ctxAdmin, isEditMode } = useEditMode();
  // 編集操作（追加・削除）は編集モード中の管理者のみ
  const isAdmin = ctxAdmin && isEditMode;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAddPage = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    setError("");
    const res = await fetch(`/api/s/${sectionSlug}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const page = await res.json();
      setNewTitle("");
      setShowAddForm(false);
      router.refresh();
      router.push(`/s/${sectionSlug}/${page.slug}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "エラーが発生しました");
    }
    setAdding(false);
  };

  const handleDeletePage = async (page: Page) => {
    if (!confirm(`「${page.title}」を削除しますか？この操作は元に戻せません。`)) return;
    const res = await fetch(`/api/s/${sectionSlug}/pages/${page.id}`, { method: "DELETE" });
    if (res.ok) {
      const remaining = pages.filter((p) => p.id !== page.id);
      router.refresh();
      if (pathname === `/s/${sectionSlug}/${page.slug}`) {
        if (remaining.length > 0) {
          router.push(`/s/${sectionSlug}/${remaining[0].slug}`);
        } else {
          router.push(`/s/${sectionSlug}`);
        }
      }
    }
  };

  // 閲覧ユーザーにはコンテンツが保存済みのページのみ表示
  const visiblePages = isAdmin ? pages : pages.filter((p) => p.hasContent);

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-[#EEEEEE] sticky top-0 max-h-screen overflow-y-auto flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center px-4 py-3 border-b border-[#EEEEEE] flex-shrink-0">
        <span className="text-sm font-semibold text-[#AAAAAA] uppercase tracking-wider truncate">
          {sectionName}
        </span>
      </div>

      {/* ナビ */}
      <nav className="flex-1 py-2">
        {visiblePages.map((page) => {
          const isActive = pathname === `/s/${sectionSlug}/${page.slug}`;
          return (
            <div key={page.id} className="flex items-center group pr-2">
              <Link
                href={`/s/${sectionSlug}/${page.slug}`}
                className={`flex items-center gap-1.5 pl-4 pr-2 py-1.5 text-sm transition-colors flex-1 min-w-0 ${
                  isActive
                    ? "bg-[#E2EDF5] text-[#0067B8] font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <span className="text-gray-300 flex-shrink-0 text-base leading-none">·</span>
                <span className="truncate">{page.title}</span>
                {/* 未保存ページの管理者向けバッジ */}
                {isAdmin && !page.hasContent && (
                  <span className="text-[10px] text-gray-300 flex-shrink-0 ml-1">未保存</span>
                )}
              </Link>
              {isAdmin && pages.length > 1 && (
                <button
                  onClick={() => handleDeletePage(page)}
                  className="flex-shrink-0 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1"
                  title="削除"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        {/* 閲覧ユーザー向け：表示できるページがない場合 */}
        {!isAdmin && visiblePages.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-300">まだページがありません</p>
        )}
      </nav>

      {/* ページ追加（編集モード中の管理者のみ） */}
      {isAdmin && (
        <div className="border-t border-[#EEEEEE] p-3 flex-shrink-0">
          {showAddForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="ページ名"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1494D6]"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleAddPage(); }}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-1.5">
                <button
                  onClick={handleAddPage}
                  disabled={adding || !newTitle.trim()}
                  className="flex-1 bg-[#0067B8] text-white py-1.5 rounded-lg text-xs font-medium hover:bg-[#005a9e] disabled:opacity-50"
                >
                  {adding ? "追加中..." : "追加"}
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewTitle(""); setError(""); }}
                  className="border border-gray-200 text-gray-500 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-50"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full text-left text-xs text-gray-400 hover:text-[#0067B8] py-1 flex items-center gap-1"
            >
              <span>+</span>
              <span>ページを追加</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
