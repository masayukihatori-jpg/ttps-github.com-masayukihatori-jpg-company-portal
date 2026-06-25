"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  order: number;
}

export default function DepartmentManager({ initial }: { initial: Department[] }) {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>(initial);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = () => router.refresh();

  /* ── 追加 ── */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    const res = await fetch("/api/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const dept = await res.json();
      setDepartments((prev) => [...prev, dept]);
      setNewName("");
      setAdding(false);
    }
    setLoading(false);
    refresh();
  };

  /* ── 編集保存 ── */
  const handleEditSave = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDepartments((prev) => prev.map((d) => (d.id === id ? updated : d)));
      setEditId(null);
    }
    setLoading(false);
    refresh();
  };

  /* ── 削除 ── */
  const handleDelete = async (id: string) => {
    if (!confirm("この部門を削除しますか？")) return;
    setLoading(true);
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    setDepartments((prev) => prev.filter((d) => d.id !== id));
    setLoading(false);
    refresh();
  };

  /* ── 順番移動 ── */
  const moveItem = async (index: number, direction: "up" | "down") => {
    const target = departments[index];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= departments.length) return;
    const swap = departments[swapIndex];

    setLoading(true);
    await Promise.all([
      fetch(`/api/departments/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: swap.order }),
      }),
      fetch(`/api/departments/${swap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: target.order }),
      }),
    ]);

    const next = [...departments];
    next[index] = { ...target, order: swap.order };
    next[swapIndex] = { ...swap, order: target.order };
    next.sort((a, b) => a.order - b.order);
    setDepartments(next);
    setLoading(false);
    refresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* リスト */}
      {departments.length === 0 && !adding ? (
        <div className="p-10 text-center text-gray-400 text-sm">
          <p className="text-3xl mb-3">🏢</p>
          <p>部門がまだ登録されていません</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {departments.map((dept, i) => (
            <li key={dept.id} className="flex items-center gap-3 px-5 py-3">
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
                  disabled={i === departments.length - 1 || loading}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                >
                  ▼
                </button>
              </div>

              {/* 名前 / 編集フォーム */}
              {editId === dept.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(dept.id); if (e.key === "Escape") setEditId(null); }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
                />
              ) : (
                <span className="flex-1 text-sm text-gray-700">{dept.name}</span>
              )}

              {/* 操作ボタン */}
              {editId === dept.id ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditSave(dept.id)}
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
                    onClick={() => { setEditId(dept.id); setEditName(dept.name); }}
                    className="text-xs text-gray-400 hover:text-[#0067B8] px-2 py-1.5"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDelete(dept.id)}
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
        <form onSubmit={handleAdd} className="flex items-center gap-2 px-5 py-3 border-t border-gray-50 bg-gray-50">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="部門名を入力"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6]"
          />
          <button
            type="submit"
            disabled={loading || !newName.trim()}
            className="text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] disabled:opacity-50"
          >
            追加
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName(""); }}
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
            + 部門を追加
          </button>
        </div>
      )}
    </div>
  );
}
