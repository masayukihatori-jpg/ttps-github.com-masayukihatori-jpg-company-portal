"use client";

import { useState } from "react";
import Image from "next/image";

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  department: string | null;
  position: string | null;
  createdAt: string;
}

export default function UserManager({
  initialUsers,
  myId,
}: {
  initialUsers: UserItem[];
  myId: string;
}) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleRoleChange = async (userId: string, newRole: "ADMIN" | "MEMBER") => {
    setUpdating(userId);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
    setUpdating(null);
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    );
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const memberCount = users.filter((u) => u.role === "MEMBER").length;

  return (
    <div className="max-w-4xl space-y-4">
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "総ユーザー数", value: users.length, color: "text-[#192E61]" },
          { label: "管理者", value: adminCount, color: "text-[#0067B8]" },
          { label: "閲覧のみ", value: memberCount, color: "text-[#555555]" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#EEEEEE] p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#AAAAAA] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 検索 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]" width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          placeholder="名前・メール・部署で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-[#DDDDDD] rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0067B8] bg-white"
        />
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-2xl border border-[#EEEEEE] overflow-hidden">
        {/* テーブルヘッダー */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-[#F8FAFC] border-b border-[#EEEEEE] text-xs font-medium text-[#AAAAAA] uppercase tracking-wide">
          <span>ユーザー</span>
          <span className="w-28 text-center">権限</span>
          <span className="w-24 text-center">登録日</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[#AAAAAA] text-sm">
            該当するユーザーが見つかりません
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {filtered.map((user) => {
              const isMe = user.id === myId;
              const isUpdating = updating === user.id;
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors"
                >
                  {/* ユーザー情報 */}
                  <div className="flex items-center gap-3 min-w-0">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name ?? ""}
                        width={36}
                        height={36}
                        className="rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#E2EDF5] flex items-center justify-center text-[#0067B8] text-sm font-bold flex-shrink-0">
                        {user.name?.charAt(0) ?? user.email?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#192E61] truncate">
                          {user.name ?? "（名前未設定）"}
                        </p>
                        {isMe && (
                          <span className="text-xs bg-[#E2EDF5] text-[#0067B8] px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            自分
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#AAAAAA] truncate">{user.email}</p>
                      {(user.department || user.position) && (
                        <p className="text-xs text-[#BBBBBB] truncate">
                          {[user.department, user.position].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 権限トグル */}
                  <div className="w-28 flex flex-col items-center gap-1">
                    <div
                      className={`flex rounded-lg border overflow-hidden text-xs ${
                        isMe ? "opacity-40 cursor-not-allowed" : isUpdating ? "opacity-50" : ""
                      }`}
                      title={isMe ? "自分自身の権限は変更できません" : undefined}
                    >
                      <button
                        disabled={isMe || isUpdating || user.role === "ADMIN"}
                        onClick={() => !isMe && user.role !== "ADMIN" && handleRoleChange(user.id, "ADMIN")}
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          user.role === "ADMIN"
                            ? "bg-[#0067B8] text-white"
                            : isMe
                            ? "bg-white text-[#AAAAAA] border-r border-[#DDDDDD]"
                            : "bg-white text-[#888888] hover:bg-[#E2EDF5] hover:text-[#0067B8] border-r border-[#DDDDDD]"
                        }`}
                      >
                        管理者
                      </button>
                      <button
                        disabled={isMe || isUpdating || user.role === "MEMBER"}
                        onClick={() => !isMe && user.role !== "MEMBER" && handleRoleChange(user.id, "MEMBER")}
                        className={`px-3 py-1.5 font-medium transition-colors ${
                          user.role === "MEMBER"
                            ? "bg-[#555555] text-white"
                            : isMe
                            ? "bg-white text-[#AAAAAA]"
                            : "bg-white text-[#888888] hover:bg-gray-100"
                        }`}
                      >
                        閲覧のみ
                      </button>
                    </div>
                    {isMe && (
                      <span className="text-[10px] text-[#CCCCCC] leading-tight">変更不可（自分）</span>
                    )}
                  </div>

                  {/* 登録日 */}
                  <div className="w-24 text-center">
                    <p className="text-xs text-[#AAAAAA]">
                      {new Date(user.createdAt).toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-[#AAAAAA]">
        ※ 管理者はお知らせ・マニュアル・規程・会社情報の投稿・編集・削除ができます。閲覧のみは読み取りのみです。
      </p>
    </div>
  );
}
