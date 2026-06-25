"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

const COLOR_OPTIONS = [
  { value: "bg-gray-100 text-gray-700",     label: "灰" },
  { value: "bg-blue-100 text-blue-700",     label: "青" },
  { value: "bg-purple-100 text-purple-700", label: "紫" },
  { value: "bg-green-100 text-green-700",   label: "緑" },
  { value: "bg-orange-100 text-orange-700", label: "オレンジ" },
  { value: "bg-red-100 text-red-700",       label: "赤" },
  { value: "bg-yellow-100 text-yellow-700", label: "黄" },
  { value: "bg-pink-100 text-pink-700",     label: "ピンク" },
];

export default function AnnouncementCategoryManager({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initial);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("bg-gray-100 text-gray-700");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("bg-gray-100 text-gray-700");
  const [loading, setLoading] = useState(false);

  const refresh = () => router.refresh();

  /* ── 追加 ── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/announcement-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      setNewName("");
      setNewColor("bg-gray-100 text-gray-700");
      setAdding(false);
    }
    setLoading(false);
    refresh();
  };

  /* ── 編集保存 ── */
  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/announcement-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditId(null);
    }
    setLoading(false);
    refresh();
  };

  /* ── 削除 ── */
  const handleDelete = async (id: string) => {
    if (!confirm("このカテゴリを削除しますか？")) return;
    setLoading(true);
    await fetch(`/api/announcement-categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setLoading(false);
    refresh();
  };

  /* ── 順番移動 ── */
  const moveItem = async (index: number, direction: "up" | "down") => {
    const target = categories[index];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= categories.length) return;
    const swap = categories[swapIndex];

    setLoading(true);
    await Promise.all([
      fetch(`/api/announcement-categories/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: swap.order }),
      }),
      fetch(`/api/announcement-categories/${swap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: target.order }),
      }),
    ]);

    const next = [...categories];
    next[index] = { ...target, order: swap.order };
    next[swapIndex] = { ...swap, order: target.order };
    next.sort((a, b) => a.order - b.order);
    setCategories(next);
    setLoading(false);
    refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* リスト */}
      {categories.length === 0 && !adding ? (
        <div className="p-10 text-center text-gray-400 text-sm">
          <p className="text-3xl mb-3">🏷️</p>
          <p>カテゴリがまだ登録されていません</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {categories.map((cat, i) => (
            <li key={cat.id} className="flex items-center gap-3 px-5 py-3">
              {/* 順番操作 */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveItem(i, "up")}
                  disabled={i === 0 || loading}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveItem(i, "down")}
                  disabled={i === categories.length - 1 || loading}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                >
                  ▼
                </button>
              </div>

              {/* 名前 / 編集フォーム */}
              {editId === cat.id ? (
                <div className="flex flex-1 items-center gap-2">
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEditSave(cat.id);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
                  />
                  <select
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1494D6] bg-white"
                  >
                    {COLOR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {/* プレビュー */}
                  <span className={`text-xs px-2 py-1 rounded-full ${editColor}`}>{editName || "プレビュー"}</span>
                </div>
              ) : (
                <div className="flex flex-1 items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${cat.color}`}>{cat.name}</span>
                </div>
              )}

              {/* 操作ボタン */}
              {editId === cat.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSave(cat.id)}
                    disabled={loading}
                    className="text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] disabled:opacity-50"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditId(cat.id);
                      setEditName(cat.name);
                      setEditColor(cat.color);
                    }}
                    className="text-xs text-gray-400 hover:text-[#0067B8] px-2 py-1.5"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    disabled={loading}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 追加フォーム */}
      {adding ? (
        <form
          onSubmit={handleAdd}
          className="flex items-center gap-2 px-5 py-3 border-t border-gray-50 bg-gray-50 flex-wrap"
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="カテゴリ名を入力"
            className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
          />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1494D6] bg-white"
          >
            {COLOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {newName && (
            <span className={`text-xs px-2 py-1 rounded-full ${newColor}`}>{newName}</span>
          )}
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] disabled:opacity-50"
          >
            追加
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewName("");
              setNewColor("bg-gray-100 text-gray-700");
            }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5"
          >
            キャンセル
          </button>
        </form>
      ) : (
        <div className="px-5 py-3 border-t border-gray-50">
          <button
            onClick={() => setAdding(true)}
            className="text-sm text-[#0067B8] hover:text-[#005a9e] font-medium"
          >
            + カテゴリを追加
          </button>
        </div>
      )}
    </div>
  );
}
