"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Link from "next/link";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

export default function NewManualPageForm() {
  const router = useRouter();
  const { categoryId, sectionId } = useParams<{ categoryId: string; sectionId: string }>();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");

  const submit = async (isDraft: boolean) => {
    if (!title.trim()) { setError("タイトルは必須です"); return; }
    if (isDraft) setSavingDraft(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/manual/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, sectionId, isDraft }),
      });
      if (!res.ok) {
        let msg = "保存に失敗しました";
        try { const d = await res.json(); msg = d.error ?? msg; } catch { msg = `HTTP ${res.status}`; }
        setError(msg);
        return;
      }
      const page = await res.json();
      router.push(`/manual/${categoryId}/${sectionId}/${page.id}`);
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

  return (
    <>
      <Header title="ページを作成" />
      <main className="flex-1 flex flex-col pt-6 px-6 pb-4 overflow-hidden">
        <nav className="text-sm text-gray-400 mb-5 flex-shrink-0">
          <Link href="/manual" className="hover:text-[#0067B8]">マニュアル</Link>
          <span className="mx-2">›</span>
          <Link href={`/manual/${categoryId}`} className="hover:text-[#0067B8]">戻る</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">新規ページ</span>
        </nav>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col flex-1 min-h-0">
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 gap-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex-shrink-0">{error}</div>
            )}
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ページタイトルを入力"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
              />
            </div>
            <div className="flex flex-col flex-1 min-h-0">
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex-shrink-0">本文</label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="マニュアルの内容を入力してください..."
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
                {loading ? "保存中..." : "公開する"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
