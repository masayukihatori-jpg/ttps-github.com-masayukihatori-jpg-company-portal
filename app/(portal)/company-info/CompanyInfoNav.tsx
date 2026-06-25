"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPANY_INFO_PAGES } from "@/lib/company-info";

export default function CompanyInfoNav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-[#EEEEEE] sticky top-0 max-h-screen overflow-y-auto flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center px-4 py-3 border-b border-[#EEEEEE] flex-shrink-0">
        <span className="text-sm font-semibold text-[#AAAAAA] uppercase tracking-wider">
          会社情報
        </span>
      </div>

      {/* ナビ */}
      <nav className="flex-1 py-2">
        {COMPANY_INFO_PAGES.map((item) => {
          const isActive = pathname === `/company-info/${item.slug}`;
          return (
            <Link
              key={item.slug}
              href={`/company-info/${item.slug}`}
              className={`flex items-center gap-1.5 pl-4 pr-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-[#E2EDF5] text-[#0067B8] font-medium"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <span className="text-gray-300 flex-shrink-0 text-base leading-none">·</span>
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
