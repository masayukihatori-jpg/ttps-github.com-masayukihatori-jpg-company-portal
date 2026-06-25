"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEditMode } from "@/contexts/EditModeContext";

/* ── ナビ項目定義（表示順） ── */
const NAV_ITEMS = [
  { href: "/helpdesk",           label: "お知らせ",     Icon: HelpdeskIcon, activePrefix: "/helpdesk" },
  { href: "/announcements",      label: "ヘルプデスク", Icon: NewsIcon,     activePrefix: "/announcements" },
  { href: "/company-info/basic", label: "会社情報",     Icon: CompanyIcon,  activePrefix: "/company-info" },
  { href: "/regulations",        label: "規程",         Icon: RegIcon,      activePrefix: "/regulations" },
  { href: "/manual",             label: "マニュアル",   Icon: ManualIcon,   activePrefix: "/manual" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/users",                           label: "ユーザー管理",         Icon: UsersIcon },
  { href: "/master/departments",              label: "部門マスタ",           Icon: MasterIcon },
  { href: "/master/announcement-categories",  label: "お知らせカテゴリ",     Icon: MasterIcon },
  { href: "/master/content-sections",         label: "カスタムセクション",   Icon: MasterIcon },
  { href: "/admin/helpdesk-logs",             label: "ヘルプデスク履歴",     Icon: MasterIcon },
  { href: "/admin/settings",                  label: "システム設定",         Icon: MasterIcon },
];

/* ── アイコン SVG ── */
function NewsIcon({ active }: { active: boolean }) {
  const c = active ? "#0067B8" : "#AAAAAA";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke={c} strokeWidth="1.8"/>
      <line x1="7" y1="9" x2="17" y2="9" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="7" y1="13" x2="14" y2="13" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function ManualIcon({ active }: { active: boolean }) {
  const c = active ? "#0067B8" : "#AAAAAA";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h10l6 6v10a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke={c} strokeWidth="1.8"/>
      <path d="M14 4v6h6" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      <line x1="7" y1="13" x2="14" y2="13" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="7" y1="17" x2="14" y2="17" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function RegIcon({ active }: { active: boolean }) {
  const c = active ? "#0067B8" : "#AAAAAA";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={c} strokeWidth="1.8"/>
      <rect x="9" y="3" width="6" height="4" rx="1" stroke={c} strokeWidth="1.8"/>
      <line x1="9" y1="12" x2="15" y2="12" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="9" y1="16" x2="13" y2="16" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function HelpdeskIcon({ active }: { active: boolean }) {
  const c = active ? "#0067B8" : "#AAAAAA";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={c} strokeWidth="1.8"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="17" r="0.8" fill={c}/>
    </svg>
  );
}
function CompanyIcon({ active }: { active: boolean }) {
  const c = active ? "#0067B8" : "#AAAAAA";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 21h18" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M5 21V7l7-4 7 4v14" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
      <rect x="9" y="13" width="3" height="4" rx="0.5" stroke={c} strokeWidth="1.6"/>
      <rect x="12" y="13" width="3" height="4" rx="0.5" stroke={c} strokeWidth="1.6"/>
    </svg>
  );
}
function MasterIcon({ active }: { active: boolean }) {
  const c = active ? "#0067B8" : "#AAAAAA";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke={c} strokeWidth="1.8"/>
    </svg>
  );
}
function UsersIcon({ active }: { active: boolean }) {
  const c = active ? "#0067B8" : "#AAAAAA";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke={c} strokeWidth="1.8"/>
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 3.13a4 4 0 010 7.75" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M21 21v-2a4 4 0 00-3-3.85" stroke={c} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

/* ── ナビリンク共通コンポーネント ── */
function NavLink({
  href, label, Icon, active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ active: boolean }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? "bg-[#E2EDF5] text-[#0067B8]"
          : "text-[#555555] hover:bg-[#EFF2F4] hover:text-[#192E61]"
      }`}
    >
      <Icon active={active} />
      {label}
    </Link>
  );
}

interface CustomSection {
  id: string;
  name: string;
  slug: string;
  order: number;
  firstPageSlug: string | null;
}

/* ── メインコンポーネント ── */
export default function Sidebar({
  isAdmin = false,
  customSections = [],
}: {
  isAdmin?: boolean;
  customSections?: CustomSection[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isEditMode } = useEditMode();

  // カスタムセクションをローカル state で管理（並び替えの楽観的更新）
  const [sections, setSections] = useState(customSections);

  // カスタムセクション削除
  const handleDeleteSection = async (e: React.MouseEvent, section: CustomSection) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`「${section.name}」を削除しますか？\n内包するページとファイルもすべて削除されます。`)) return;
    const res = await fetch(`/api/s/${section.slug}`, { method: "DELETE" });
    if (res.ok) {
      setSections((prev) => prev.filter((s) => s.id !== section.id));
      router.refresh();
      if (pathname.startsWith(`/s/${section.slug}`)) router.push("/announcements");
    }
  };

  // カスタムセクション並び替え
  const handleMove = async (index: number, direction: "up" | "down") => {
    const otherIndex = direction === "up" ? index - 1 : index + 1;
    if (otherIndex < 0 || otherIndex >= sections.length) return;

    const a = sections[index];
    const b = sections[otherIndex];

    // 楽観的更新
    const next = [...sections];
    next[index] = b;
    next[otherIndex] = a;
    setSections(next);

    // order 値を交換して保存
    await Promise.all([
      fetch(`/api/s/${a.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/s/${b.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);
    router.refresh();
  };

  const canReorder = isAdmin && isEditMode;

  return (
    <aside className="w-60 bg-white border-r border-[#DDDDDD] flex flex-col h-screen fixed left-0 top-0 z-10">

      {/* ロゴ */}
      <Link
        href="/announcements"
        className="flex items-center justify-center px-4 py-4 border-b border-[#EEEEEE] hover:bg-[#EFF2F4] transition-colors"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="AlbaLink" style={{ width: "160px", height: "auto" }} />
      </Link>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {/* 固定ナビ項目 */}
        {NAV_ITEMS.map(({ href, label, Icon, activePrefix }) => (
          <NavLink key={href} href={href} label={label} Icon={Icon} active={pathname.startsWith(activePrefix)} />
        ))}

        {/* カスタムセクション */}
        {sections.map((section, index) => {
          const href = section.firstPageSlug
            ? `/s/${section.slug}/${section.firstPageSlug}`
            : `/s/${section.slug}`;
          const active = pathname.startsWith(`/s/${section.slug}`);
          return (
            <div key={section.id} className="group relative">
              <NavLink href={href} label={section.name} Icon={CompanyIcon} active={active} />
              {/* 並び替えボタン（編集モード中の管理者のみ）— 絶対配置で左端に重ねる */}
              {canReorder && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    className="text-gray-300 hover:text-[#0067B8] disabled:opacity-20 leading-none text-xs px-0.5"
                    title="上へ"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === sections.length - 1}
                    className="text-gray-300 hover:text-[#0067B8] disabled:opacity-20 leading-none text-xs px-0.5"
                    title="下へ"
                  >
                    ▼
                  </button>
                </div>
              )}
              {/* 削除ボタン（編集モード中の管理者のみ） */}
              {canReorder && (
                <button
                  onClick={(e) => handleDeleteSection(e, section)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1 py-0.5 rounded z-10"
                  title="削除"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        {/* 管理者メニュー */}
        {isAdmin && (
          <>
            <div className="mx-3 my-2 border-t border-[#EEEEEE]" />
            <p className="px-3 pb-1 text-[10px] font-bold text-[#CCCCCC] tracking-widest uppercase">管理者</p>
            {ADMIN_NAV_ITEMS.map(({ href, label, Icon }) => (
              <NavLink key={href} href={href} label={label} Icon={Icon} active={pathname.startsWith(href)} />
            ))}
          </>
        )}
      </nav>

      {/* ログアウト */}
      <div className="p-3 border-t border-[#EEEEEE]">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#888888] hover:bg-[#EFF2F4] hover:text-[#555555] w-full transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#AAAAAA" strokeWidth="1.8" strokeLinecap="round"/>
            <polyline points="16 17 21 12 16 7" stroke="#AAAAAA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="21" y1="12" x2="9" y2="12" stroke="#AAAAAA" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          ログアウト
        </button>
      </div>
    </aside>
  );
}
