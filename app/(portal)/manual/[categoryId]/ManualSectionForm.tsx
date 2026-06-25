"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ManualSectionForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await fetch("/api/manual/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, categoryId }),
    });
    setName("");
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
        <span>+</span> 中項目を追加
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="中項目名"
        className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1494D6] w-44"
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-[#0067B8] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#005a9e] disabled:opacity-50"
      >
        追加
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-600 text-sm"
      >
        キャンセル
      </button>
    </form>
  );
}
