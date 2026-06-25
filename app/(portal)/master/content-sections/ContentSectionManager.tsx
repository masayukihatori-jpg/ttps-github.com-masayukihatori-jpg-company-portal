"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Page {
  id: string;
  title: string;
  slug: string;
}

interface Section {
  id: string;
  name: string;
  slug: string;
  hidden: boolean;
  enableText: boolean;
  enableFiles: boolean;
  enableEmbed: boolean;
  pages: Page[];
}

const TYPE_LABELS = [
  { key: "enableText",  icon: "📝", label: "本文" },
  { key: "enableFiles", icon: "📎", label: "添付ファイル" },
  { key: "enableEmbed", icon: "🌐", label: "外部サイト埋め込み" },
] as const;

export default function ContentSectionManager({ initial }: { initial: Section[] }) {
  const router = useRouter();
  const [sections, setSections] = useState(initial);

  // ────── セクション追加 ──────
  const [showAddSection, setShowAddSection] = useState(false);
  const [newName, setNewName] = useState("");
  const [newContentType, setNewContentType] = useState<"text" | "files" | "embed">("text");
  const [addSectionError, setAddSectionError] = useState("");
  const [addingSec, setAddingSec] = useState(false);

  const handleAddSection = async () => {
    if (!newName.trim()) return;
    setAddingSec(true);
    setAddSectionError("");
    const res = await fetch("/api/s", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        enableText:  newContentType === "text",
        enableFiles: newContentType === "files",
        enableEmbed: newContentType === "embed",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSections([...sections, { ...data, pages: [] }]);
      setNewName("");
      setNewContentType("text");
      setShowAddSection(false);
      router.refresh();
    } else {
      setAddSectionError(data.error ?? "エラーが発生しました");
    }
    setAddingSec(false);
  };

  // ────── セクション削除 ──────
  const handleDeleteSection = async (section: Section) => {
    if (!confirm(`「${section.name}」を削除しますか？\n内包するページとファイルもすべて削除されます。この操作は元に戻せません。`)) return;
    const res = await fetch(`/api/s/${section.slug}`, { method: "DELETE" });
    if (res.ok) {
      setSections(sections.filter((s) => s.id !== section.id));
      router.refresh();
    }
  };

  // ────── 表示/非表示トグル ──────
  const handleToggleHidden = async (section: Section) => {
    const res = await fetch(`/api/s/${section.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !section.hidden }),
    });
    if (res.ok) {
      setSections(sections.map((s) =>
        s.id === section.id ? { ...s, hidden: !s.hidden } : s
      ));
      router.refresh();
    }
  };

  // ────── ページ追加 ──────
  const [addingPageFor, setAddingPageFor] = useState<string | null>(null);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [addPageError, setAddPageError] = useState("");
  const [addingPage, setAddingPage] = useState(false);

  const openAddPage = (sectionId: string) => {
    setAddingPageFor(sectionId);
    setNewPageTitle(""); setAddPageError("");
  };

  const handleAddPage = async (section: Section) => {
    if (!newPageTitle.trim()) return;
    setAddingPage(true);
    setAddPageError("");
    const res = await fetch(`/api/s/${section.slug}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newPageTitle.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setSections(sections.map((s) =>
        s.id === section.id ? { ...s, pages: [...s.pages, { id: data.id, title: data.title, slug: data.slug }] } : s
      ));
      setAddingPageFor(null);
      setNewPageTitle("");
      router.refresh();
    } else {
      setAddPageError(data.error ?? "エラーが発生しました");
    }
    setAddingPage(false);
  };

  // ────── ページ削除 ──────
  const handleDeletePage = async (section: Section, page: Page) => {
    if (!confirm(`「${page.title}」を削除しますか？この操作は元に戻せません。`)) return;
    const res = await fetch(`/api/s/${section.slug}/pages/${page.id}`, { method: "DELETE" });
    if (res.ok) {
      setSections(sections.map((s) =>
        s.id === section.id ? { ...s, pages: s.pages.filter((p) => p.id !== page.id) } : s
      ));
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {sections.length === 0 && !showAddSection && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">📂</p>
          <p className="text-sm">まだカスタムセクションがありません</p>
          <p className="text-xs mt-1">「+ セクションを追加」から新しいセクションを作成できます</p>
        </div>
      )}

      {/* セクション一覧 */}
      {sections.map((section) => (
        <div
          key={section.id}
          className={`bg-white rounded-2xl border p-5 transition-opacity ${
            section.hidden ? "border-gray-100 opacity-60" : "border-gray-200"
          }`}
        >
          {/* セクションヘッダー */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800">{section.name}</h3>
                {section.hidden && (
                  <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">非表示</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                <code className="bg-gray-50 px-1 rounded">/s/{section.slug}</code>
                <span className="ml-2">· {section.pages.length}ページ</span>
              </p>
              {/* コンテンツタイプ表示 */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {TYPE_LABELS.map(({ key, icon, label }) =>
                  section[key] ? (
                    <span key={key} className="text-[11px] bg-[#E2EDF5] text-[#0067B8] px-2 py-0.5 rounded-full">
                      {icon} {label}
                    </span>
                  ) : null
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleToggleHidden(section)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  section.hidden
                    ? "bg-[#E2EDF5] text-[#0067B8] hover:bg-[#d0e4f0]"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {section.hidden ? "👁 表示する" : "🙈 非表示"}
              </button>
              <button
                onClick={() => handleDeleteSection(section)}
                className="text-xs text-red-400 hover:text-red-600 px-2 py-1.5"
              >
                削除
              </button>
            </div>
          </div>

          {/* ページ一覧 */}
          {section.pages.length === 0 ? (
            <p className="text-xs text-gray-300 mb-3">ページがありません</p>
          ) : (
            <ul className="space-y-1 mb-3">
              {section.pages.map((page) => (
                <li key={page.id} className="flex items-center gap-2 group">
                  <span className="text-gray-300 flex-shrink-0">·</span>
                  <span className="text-sm text-gray-600 flex-1 truncate">{page.title}</span>
                  <code className="text-xs text-gray-300 flex-shrink-0">{page.slug}</code>
                  <Link
                    href={`/s/${section.slug}/${page.slug}`}
                    className="text-xs text-[#0067B8] hover:underline flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    編集
                  </Link>
                  <button
                    onClick={() => handleDeletePage(section, page)}
                    className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* ページ追加フォーム */}
          {addingPageFor === section.id ? (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="ページ名"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1494D6]"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleAddPage(section); }}
              />
              {addPageError && <p className="text-xs text-red-500">{addPageError}</p>}
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAddPage(section)}
                  disabled={addingPage || !newPageTitle.trim()}
                  className="flex-1 bg-[#0067B8] text-white py-1.5 rounded-lg text-xs font-medium hover:bg-[#005a9e] disabled:opacity-50"
                >
                  {addingPage ? "追加中..." : "追加"}
                </button>
                <button
                  onClick={() => setAddingPageFor(null)}
                  className="border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-xs hover:bg-white"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openAddPage(section.id)}
              className="text-xs text-gray-400 hover:text-[#0067B8] flex items-center gap-1"
            >
              <span>+</span> ページを追加
            </button>
          )}
        </div>
      ))}

      {/* セクション追加フォーム */}
      {showAddSection ? (
        <div className="bg-white rounded-2xl border border-[#0067B8]/20 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">新しいセクションを追加</h3>

          {/* セクション名 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">セクション名（サイドバーに表示される名前）</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="例: 社員ハンドブック"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); }}
            />
          </div>

          {/* コンテンツタイプ選択（1つ選択） */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">コンテンツタイプ</label>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "text",  icon: "📝", label: "本文" },
                { key: "files", icon: "📎", label: "添付ファイル" },
                { key: "embed", icon: "🌐", label: "外部サイト埋め込み" },
              ] as const).map(({ key, icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setNewContentType(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
                    newContentType === key
                      ? "bg-[#0067B8] text-white border-[#0067B8]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {addSectionError && <p className="text-sm text-red-500">{addSectionError}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAddSection}
              disabled={addingSec || !newName.trim()}
              className="flex-1 bg-[#0067B8] text-white py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e] disabled:opacity-50"
            >
              {addingSec ? "追加中..." : "追加する"}
            </button>
            <button
              onClick={() => {
                setShowAddSection(false);
                setNewName(""); setAddSectionError("");
                setNewContentType("text");
              }}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddSection(true)}
          className="w-full bg-white border border-dashed border-gray-300 rounded-2xl py-4 text-sm text-gray-400 hover:border-[#0067B8] hover:text-[#0067B8] transition-colors"
        >
          + セクションを追加
        </button>
      )}
    </div>
  );
}
