"use client";

import { useSession } from "next-auth/react";
import Image from "next/image";
import { useEditMode } from "@/contexts/EditModeContext";
import { useState } from "react";

export default function Header({ title }: { title: string }) {
  const { data: session } = useSession();
  const { isAdmin, isEditMode, enterEditMode, discardAndExit, saveAndExit } = useEditMode();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAndExit();
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-[#EEEEEE] flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-base font-bold text-[#192E61]">{title}</h1>

      <div className="flex items-center gap-3">
        {/* 編集モードボタン（管理者のみ） */}
        {isAdmin && !isEditMode && (
          <button
            onClick={enterEditMode}
            className="flex items-center gap-1.5 text-xs font-medium text-[#0067B8] bg-[#E2EDF5] hover:bg-[#d0e4f0] px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            編集モード
          </button>
        )}

        {isAdmin && isEditMode && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#0067B8] bg-[#E2EDF5] px-2 py-1 rounded-md font-medium">
              編集中
            </span>
            <button
              onClick={discardAndExit}
              className="text-xs font-medium text-[#888888] border border-[#DDDDDD] hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              編集を破棄
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-[#0067B8] hover:bg-[#005a9e] disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {saving ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
              保存
            </button>
          </div>
        )}

        {/* ユーザー情報 */}
        {session?.user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-[#192E61]">{session.user.name}</p>
              <p className="text-xs text-[#888888]">
                {(session.user as any).department ?? session.user.email}
              </p>
            </div>
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={34}
                height={34}
                className="rounded-full"
              />
            ) : (
              <div
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ background: "linear-gradient(54deg, #0061b3 0%, #0089d0 100%)" }}
              >
                {session.user.name?.charAt(0) ?? "?"}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
