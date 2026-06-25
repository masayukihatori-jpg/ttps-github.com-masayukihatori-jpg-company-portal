"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/Header";
import Link from "next/link";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

interface CategoryOption {
  id: string;
  name: string;
  color: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

export default function EditAnnouncementPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
    organization: "",
    important: false,
  });
  const [currentIsDraft, setCurrentIsDraft] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/announcements/${id}`).then((r) => r.json()),
      fetch("/api/announcement-categories").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ]).then(([data, cats, depts]) => {
      setCategories(cats);
      setDepartments(depts);
      setCurrentIsDraft(data.isDraft ?? false);
      setForm({
        title: data.title,
        content: data.content,
        category: data.category,
        organization: data.organization ?? "",
        important: data.important,
      });
      setFetching(false);
    });
  }, [id]);

  const validate = () => {
    if (!form.title || !form.content) {
      setError("タイトルと内容を入力してください");
      return false;
    }
    if (!form.organization) {
      setError("組織を選択してください");
      return false;
    }
    return true;
  };

  const submit = async (isDraft: boolean) => {
    if (!validate()) return;
    if (isDraft) setSavingDraft(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDraft }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "更新に失敗しました");
      }
      router.push(`/announcements/${id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingDraft(false);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(false);
  };

  if (fetching) return <div className="flex-1 p-6 text-[#AAAAAA]">読み込み中...</div>;

  return (
    <>
      <Header title="お知らせを編集" />
      <main className="flex-1 p-6 max-w-2xl">
        <nav className="text-sm text-[#AAAAAA] mb-5">
          <Link href="/announcements" className="hover:text-[#0067B8]">お知らせ一覧</Link>
          <span className="mx-2">›</span>
          <Link href={`/announcements/${id}`} className="hover:text-[#0067B8]">詳細</Link>
          <span className="mx-2">›</span>
          <span className="text-gray-600">編集</span>
        </nav>

        {currentIsDraft && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <span className="text-sm text-amber-700">下書きが保存されています</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">下書き</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] focus:border-transparent"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">カテゴリ</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 組織 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                組織 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] bg-white"
              >
                <option value="">選択してください</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* 内容 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                内容 <span className="text-red-500">*</span>
              </label>
              <RichTextEditor
                value={form.content}
                onChange={(html) => setForm({ ...form, content: html })}
                placeholder="お知らせの内容を入力してください..."
              />
            </div>

            {/* 重要フラグ */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="important"
                checked={form.important}
                onChange={(e) => setForm({ ...form, important: e.target.checked })}
                className="w-4 h-4 rounded accent-[#0067B8]"
              />
              <label htmlFor="important" className="text-sm text-gray-700">
                🔴 重要なお知らせとしてマークする
              </label>
            </div>

            {/* ボタン */}
            <div className="flex gap-3 pt-2">
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
