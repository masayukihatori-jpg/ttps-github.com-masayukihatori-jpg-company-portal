"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Link from "next/link";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

export default function EditManualPage() {
  const router = useRouter();
  const { categoryId, sectionId, pageId } = useParams<{
    categoryId: string; sectionId: string; pageId: string;
  }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [currentIsDraft, setCurrentIsDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/manual/pages/${pageId}`)
      .then((r) => r.json())
      .then((data) => {
        // 下書き中なら draftTitle/draftContent を編集フォームに表示
        setTitle(data.isDraft && data.draftTitle ? data.draftTitle : data.title);
        setContent(data.isDraft && data.draftContent ? data.draftContent : data.content);
        setCurrentIsDraft(data.isDraft ?? false);
        setFetching(false);
      });
  }, [pageId]);

  const submit = async (isDraft: boolean) => {
    if (!title.trim()) { setError("タイトルは必須です"); return; }
    if (isDraft) setSavingDraft(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/manual/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, isDraft }),
      });
      if (!res.ok) {
        let msg = "保存に失敗しました";
        try { const d = await res.json(); msg = d.error ?? msg; } catch { msg = `HTTP ${res.status}`; }
        setError(msg);
        return;
      }
      router.push(`/manual/${categoryId}/${sectionId}/${pageId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSavingDraft(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(false);
  };

  if (fetching) return <div className="flex-1 p-6 text-gray-400">読み込み中...</div>;

  return (
    <>
      <Header title="ページを編集" />
      <main className="flex-1 flex flex-col pt-6 px-6 pb-4 overflow-hidden">
        <nav className="text-sm text-gray-400 mb-5 flex-shrink-0">
          <Link href="/manual" className="hover:text-[#0067B8]">マニュアル</Link>
          <span className="mx-2">›</span>
          <Link href={`/manual/${categoryId}/${sectionId}/${pageId}`} className="hover:text-[#0067B8]">
            {title}
          </Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">編集</span>
        </nav>

        {currentIsDraft && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-amber-700">下書きが保存されています</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">下書き</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-5">
            {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex-shrink-0">{error}</div>}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
              />
            </div>
            <div className="flex flex-col flex-1 min-h-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex-shrink-0">本文</label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                grow
              />
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={savingDraft || loading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {savingDraft ? "保存中..." : "下書き保存"}
              </button>
              <button
                type="submit"
                disabled={loading || savingDraft}
                className="flex-1 bg-[#0067B8] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#005a9e] disabled:opacity-50"
              >
                {loading ? "保存中..." : currentIsDraft ? "公開する" : "保存する"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
