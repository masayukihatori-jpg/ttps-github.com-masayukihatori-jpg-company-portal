"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEditMode } from "@/contexts/EditModeContext";

type Page = { id: string; title: string };
type Section = { id: string; name: string; pages: Page[] };
type Category = {
  id: string;
  name: string;
  description: string | null;
  department: string | null;
  sections: Section[];
};
type SearchResult = {
  id: string;
  title: string;
  excerpt: string;
  sectionId: string;
  sectionName: string;
  categoryId: string;
  categoryName: string;
};

function toggle(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setFn(next);
}

// ━━ 小さいアイコンボタン ━━
function IconBtn({
  onClick, title, children, danger,
}: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      title={title}
      className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-colors opacity-0 group-hover:opacity-100
        ${danger ? "text-gray-300 hover:text-red-400 hover:bg-red-50" : "text-gray-300 hover:text-[#0067B8] hover:bg-[#E2EDF5]"}`}
    >
      {children}
    </button>
  );
}

export default function ManualNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isEditMode, isAdmin } = useEditMode();

  // /manual / [catId] / [secId] / [pageId] / ...
  const parts = pathname.split("/").filter(Boolean);
  const activeCatId = parts[1] ?? null;
  const activeSecId = parts[2] === "new" ? null : (parts[2] ?? null);
  const activePageId = parts[3] === "edit" || parts[3] === "new" ? null : (parts[3] ?? null);

  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(activeCatId ? [activeCatId] : [])
  );
  const [openSecs, setOpenSecs] = useState<Set<string>>(
    () => new Set(activeSecId ? [activeSecId] : [])
  );

  // ── 追加フォーム ──
  const [addingCat, setAddingCat] = useState(false);
  const [addingCatName, setAddingCatName] = useState("");
  const [addingCatLoading, setAddingCatLoading] = useState(false);

  const [addingSecCatId, setAddingSecCatId] = useState<string | null>(null);
  const [addingSecName, setAddingSecName] = useState("");
  const [addingSecLoading, setAddingSecLoading] = useState(false);

  // ── リネームフォーム ──
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renamingCatName, setRenamingCatName] = useState("");
  const [renamingSecId, setRenamingSecId] = useState<string | null>(null);
  const [renamingSecName, setRenamingSecName] = useState("");

  // ── 検索 ──
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/manual/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // ── ハンドラー ──
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingCatName.trim()) return;
    setAddingCatLoading(true);
    await fetch("/api/manual/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addingCatName }),
    });
    setAddingCatName(""); setAddingCat(false); setAddingCatLoading(false);
    router.refresh();
  };

  const handleAddSection = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!addingSecName.trim()) return;
    setAddingSecLoading(true);
    await fetch("/api/manual/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addingSecName, categoryId }),
    });
    setAddingSecName(""); setAddingSecCatId(null); setAddingSecLoading(false);
    router.refresh();
  };

  const handleRenameCategory = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!renamingCatName.trim()) return;
    await fetch(`/api/manual/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renamingCatName }),
    });
    setRenamingCatId(null);
    router.refresh();
  };

  const handleRenameSection = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!renamingSecName.trim()) return;
    await fetch(`/api/manual/sections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renamingSecName }),
    });
    setRenamingSecId(null);
    router.refresh();
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除しますか？\n配下の中項目・ページもすべて削除されます。`)) return;
    await fetch(`/api/manual/categories/${id}`, { method: "DELETE" });
    if (activeCatId === id) router.push("/manual");
    router.refresh();
  };

  const handleDeleteSection = async (id: string, name: string) => {
    if (!window.confirm(`「${name}」を削除しますか？\n配下のページもすべて削除されます。`)) return;
    await fetch(`/api/manual/sections/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-[#EEEEEE] sticky top-0 max-h-screen overflow-y-auto flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEEEE] flex-shrink-0">
        <Link
          href="/manual"
          className="text-sm font-semibold text-[#AAAAAA] uppercase tracking-wider hover:text-[#0067B8] transition-colors"
        >
          マニュアル
        </Link>
        {isAdmin && isEditMode && !addingCat && (
          <button
            onClick={() => setAddingCat(true)}
            className="text-[#0067B8] hover:bg-[#E2EDF5] w-6 h-6 rounded flex items-center justify-center text-base leading-none transition-colors"
            title="大項目を追加"
          >
            +
          </button>
        )}
      </div>

      {/* 検索ボックス */}
      <div className="px-3 py-2 border-b border-[#EEEEEE] flex-shrink-0">
        <div className="relative">
          <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="キーワード検索..."
            className="w-full text-xs pl-6 pr-6 py-1.5 border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0067B8] bg-gray-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 大項目追加フォーム */}
      {addingCat && (
        <form onSubmit={handleAddCategory} className="px-3 py-2 border-b border-[#EEEEEE] flex-shrink-0">
          <input
            autoFocus
            value={addingCatName}
            onChange={(e) => setAddingCatName(e.target.value)}
            placeholder="大項目名"
            className="w-full text-sm border border-[#DDDDDD] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0067B8] mb-1.5"
          />
          <div className="flex gap-1.5">
            <button type="submit" disabled={addingCatLoading}
              className="flex-1 bg-[#0067B8] text-white text-sm py-1 rounded-lg disabled:opacity-50">追加</button>
            <button type="button" onClick={() => { setAddingCat(false); setAddingCatName(""); }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
          </div>
        </form>
      )}

      {/* ツリー or 検索結果 */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {/* 検索モード */}
        {searchQuery.trim() ? (
          <div>
            {searching ? (
              <p className="px-4 py-3 text-xs text-gray-400">検索中...</p>
            ) : searchResults.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400">「{searchQuery}」に一致するページがありません</p>
            ) : (
              <div>
                <p className="px-4 py-1.5 text-[10px] text-gray-400">{searchResults.length}件ヒット</p>
                {searchResults.map((r) => (
                  <Link
                    key={r.id}
                    href={`/manual/${r.categoryId}/${r.sectionId}/${r.id}`}
                    onClick={() => setSearchQuery("")}
                    className="block px-3 py-2 hover:bg-gray-50 border-b border-gray-50 transition-colors"
                  >
                    <p className="text-xs font-medium text-[#192E61] truncate mb-0.5">{r.title}</p>
                    <p className="text-[10px] text-gray-400 truncate mb-1">
                      {r.categoryName} › {r.sectionName}
                    </p>
                    <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{r.excerpt}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 通常ツリー */
          <div>
        {categories.length === 0 && (
          <p className="px-4 py-3 text-xs text-gray-400">マニュアルがまだありません</p>
        )}

        {categories.map((cat) => {
          const isActiveCat = cat.id === activeCatId;
          const isOpen = openCats.has(cat.id);

          return (
            <div key={cat.id}>
              {/* ━━ 大項目 ━━ */}
              {renamingCatId === cat.id ? (
                /* リネームフォーム */
                <form
                  onSubmit={(e) => handleRenameCategory(e, cat.id)}
                  className="flex items-center gap-1 px-2 py-1.5"
                >
                  <input
                    autoFocus
                    value={renamingCatName}
                    onChange={(e) => setRenamingCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setRenamingCatId(null)}
                    className="flex-1 text-sm border border-[#0067B8] rounded px-2 py-1 focus:outline-none min-w-0"
                  />
                  <button type="submit" className="text-xs bg-[#0067B8] text-white px-2 py-1 rounded">保存</button>
                  <button type="button" onClick={() => setRenamingCatId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                </form>
              ) : (
                <div className={`flex items-center group ${isActiveCat && !activeSecId ? "bg-[#EEF5FB]" : "hover:bg-gray-50"}`}>
                  <button
                    onClick={() => toggle(openCats, setOpenCats, cat.id)}
                    className="flex-1 flex items-center gap-1.5 px-3 py-2 text-left min-w-0"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10"
                      className={`flex-shrink-0 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                      fill="currentColor">
                      <path d="M3 2l4 3-4 3V2z" />
                    </svg>
                    <span className={`text-base font-medium truncate ${isActiveCat && !activeSecId ? "text-[#0067B8]" : "text-[#192E61]"}`}>
                      {cat.name}
                    </span>
                    {cat.department && (
                      <span className="flex-shrink-0 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full leading-none">
                        {cat.department.charAt(0)}
                      </span>
                    )}
                  </button>
                  {isAdmin && isEditMode && (
                    <div className="flex items-center gap-0.5 pr-1.5">
                      {/* 中項目追加 */}
                      {isOpen && (
                        <IconBtn
                          onClick={() => { setAddingSecCatId(cat.id); setAddingSecName(""); }}
                          title="中項目を追加"
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        </IconBtn>
                      )}
                      {/* リネーム */}
                      <IconBtn
                        onClick={() => { setRenamingCatId(cat.id); setRenamingCatName(cat.name); }}
                        title="名前を変更"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </IconBtn>
                      {/* 削除 */}
                      <IconBtn
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        title="削除"
                        danger
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </IconBtn>
                    </div>
                  )}
                </div>
              )}

              {/* ━━ 中項目・ページ ━━ */}
              {isOpen && (
                <div>
                  {cat.sections.map((sec) => {
                    const isActiveSec = sec.id === activeSecId;
                    const isSecOpen = openSecs.has(sec.id);
                    const hasPages = sec.pages.length > 0;

                    return (
                      <div key={sec.id}>
                        {/* 中項目 */}
                        {renamingSecId === sec.id ? (
                          <form
                            onSubmit={(e) => handleRenameSection(e, sec.id)}
                            className="flex items-center gap-1 pl-6 pr-2 py-1.5"
                          >
                            <input
                              autoFocus
                              value={renamingSecName}
                              onChange={(e) => setRenamingSecName(e.target.value)}
                              onKeyDown={(e) => e.key === "Escape" && setRenamingSecId(null)}
                              className="flex-1 text-sm border border-[#0067B8] rounded px-2 py-1 focus:outline-none min-w-0"
                            />
                            <button type="submit" className="text-xs bg-[#0067B8] text-white px-2 py-1 rounded">保存</button>
                            <button type="button" onClick={() => setRenamingSecId(null)}
                              className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                          </form>
                        ) : (
                          <div className={`flex items-center group ${isActiveSec && !activePageId ? "bg-[#EEF5FB]" : "hover:bg-gray-50"}`}>
                            <button
                              onClick={() => hasPages ? toggle(openSecs, setOpenSecs, sec.id) : undefined}
                              className={`flex-1 flex items-center gap-1.5 pl-6 pr-1 py-1.5 text-left min-w-0 ${!hasPages ? "cursor-default" : ""}`}
                            >
                              {hasPages ? (
                                <svg width="9" height="9" viewBox="0 0 10 10"
                                  className={`flex-shrink-0 text-gray-300 transition-transform duration-150 ${isSecOpen ? "rotate-90" : ""}`}
                                  fill="currentColor">
                                  <path d="M3 2l4 3-4 3V2z" />
                                </svg>
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
                              )}
                              <span className={`text-sm truncate ${isActiveSec && !activePageId ? "text-[#0067B8] font-medium" : "text-gray-600"}`}>
                                {sec.name}
                              </span>
                            </button>
                            {isAdmin && isEditMode && (
                              <div className="flex items-center gap-0.5 pr-1.5">
                                {/* ページ追加 */}
                                <IconBtn
                                  onClick={() => router.push(`/manual/${cat.id}/${sec.id}/new`)}
                                  title="ページを追加"
                                >
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                                  </svg>
                                </IconBtn>
                                {/* リネーム */}
                                <IconBtn
                                  onClick={() => { setRenamingSecId(sec.id); setRenamingSecName(sec.name); }}
                                  title="名前を変更"
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </IconBtn>
                                {/* 削除 */}
                                <IconBtn
                                  onClick={() => handleDeleteSection(sec.id, sec.name)}
                                  title="削除"
                                  danger
                                >
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                  </svg>
                                </IconBtn>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ページ一覧 */}
                        {isSecOpen &&
                          sec.pages.map((page) => {
                            const isActivePage = page.id === activePageId;
                            return (
                              <Link
                                key={page.id}
                                href={`/manual/${cat.id}/${sec.id}/${page.id}`}
                                className={`flex items-center gap-1.5 pl-11 pr-3 py-1.5 text-sm transition-colors ${
                                  isActivePage
                                    ? "bg-[#E2EDF5] text-[#0067B8] font-medium"
                                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                }`}
                              >
                                <span className="text-gray-300 flex-shrink-0 text-base leading-none">·</span>
                                <span className="truncate">{page.title}</span>
                              </Link>
                            );
                          })}
                      </div>
                    );
                  })}

                  {/* 中項目追加フォーム（インライン） */}
                  {isAdmin && isEditMode && addingSecCatId === cat.id && (
                    <form onSubmit={(e) => handleAddSection(e, cat.id)} className="pl-6 pr-3 py-2">
                      <input
                        autoFocus
                        value={addingSecName}
                        onChange={(e) => setAddingSecName(e.target.value)}
                        onKeyDown={(e) => e.key === "Escape" && setAddingSecCatId(null)}
                        placeholder="中項目名"
                        className="w-full text-sm border border-[#DDDDDD] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0067B8] mb-1.5"
                      />
                      <div className="flex gap-1.5">
                        <button type="submit" disabled={addingSecLoading}
                          className="flex-1 bg-[#0067B8] text-white text-sm py-1 rounded-lg disabled:opacity-50">追加</button>
                        <button type="button" onClick={() => { setAddingSecCatId(null); setAddingSecName(""); }}
                          className="text-sm text-gray-400 hover:text-gray-600 px-2">✕</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
          </div>
        )}
      </nav>
    </aside>
  );
}
