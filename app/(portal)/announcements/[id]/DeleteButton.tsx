"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("このお知らせを削除しますか？")) return;
    setLoading(true);
    try {
      await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      router.push("/announcements");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "削除中..." : "削除"}
    </button>
  );
}
