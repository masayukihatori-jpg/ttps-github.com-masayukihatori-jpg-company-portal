"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
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

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "",
    organization: "",
    important: false,
  });
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);

  useEffect(() => {
    fetch("/api/announcement-categories")
      .then((r) => r.json())
      .then((data: CategoryOption[]) => {
        setCategories(data);
        if (data.length > 0) setForm((f) => ({ ...f, category: f.category || data[0].name }));
      })
      .catch(() => {});
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data: DepartmentOption[]) => {
        setDepartments(data);
      })
      .catch(() => {});
  }, []);

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
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isDraft }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "投稿に失敗しました");
      }

      router.push("/announcements");
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

  return (
    <>
      <Header title="お知らせを投稿" />
      <main className="flex-1 p-6 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
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
                placeholder="お知らせのタイトルを入力"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] focus:border-transparent"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                カテゴリ
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
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
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
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
                className="w-4 h-4 rounded accent-indigo-600"
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
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={savingDraft || loading}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingDraft ? "保存中..." : "下書き保存"}
              </button>
              <button
                type="submit"
                disabled={loading || savingDraft}
                className="flex-1 bg-[#0067B8] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#005a9e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "投稿中..." : "投稿する（公開）"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
