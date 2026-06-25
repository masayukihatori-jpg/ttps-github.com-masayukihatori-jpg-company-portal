"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Department {
  id: string;
  name: string;
  order: number;
}

export default function ManualCategoryForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDepartments(data); })
      .catch(() => {});
  }, []);

  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!department) { setError("管掌部門を選択してください"); return; }
    setError("");
    setLoading(true);
    await fetch("/api/manual/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, department }),
    });
    setName("");
    setDescription("");
    setDepartment("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-[#0067B8] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e] transition-colors flex items-center gap-2"
      >
        <span>+</span> 大項目を追加
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {error && <p className="text-red-500 text-xs w-full text-right">{error}</p>}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap justify-end">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="大項目名 *"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] w-36"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="説明（任意）"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] w-32"
        />
        <select
          value={department}
          onChange={(e) => { setDepartment(e.target.value); setError(""); }}
          className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] w-36 ${
            department ? "text-gray-800 border-gray-200" : "text-gray-400 border-red-300"
          }`}
        >
          <option value="" disabled>管掌部門 *</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#0067B8] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e] disabled:opacity-50"
        >
          追加
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); }}
          className="text-gray-400 hover:text-gray-600 px-2 py-2 text-sm"
        >
          キャンセル
        </button>
      </form>
    </div>
  );
}
