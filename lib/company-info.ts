// 会社情報の固定ページ定義
export const COMPANY_INFO_PAGES = [
  { slug: "basic",     title: "基本情報",      icon: "🏢" },
  { slug: "mvv",       title: "MVV",           icon: "🎯" },
  { slug: "offices",   title: "事業所一覧",     icon: "📍" },
  { slug: "org-chart", title: "組織図",         icon: "🔷" },
  { slug: "members",   title: "社員紹介/一覧",  icon: "👥" },
  { slug: "calendar",  title: "年間カレンダー", icon: "📅" },
] as const;

export type CompanyInfoSlug = typeof COMPANY_INFO_PAGES[number]["slug"];

export function getPageMeta(slug: string) {
  return COMPANY_INFO_PAGES.find((p) => p.slug === slug);
}
