import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { notFound } from "next/navigation";
import ManualSectionForm from "./ManualSectionForm";
import { EditModeGate } from "@/components/layout/EditModeGate";

export default async function ManualCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const isAdmin = user?.role === "ADMIN";

  const category = await prisma.manualCategory.findUnique({
    where: { id: categoryId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          pages: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, updatedAt: true, isDraft: true, draftTitle: true },
          },
        },
      },
    },
  });

  if (!category) notFound();

  return (
    <>
      <Header title={category.name} />
      <main className="flex-1 p-6 max-w-3xl">
        {/* パンくず */}
        <nav className="text-sm text-gray-400 mb-5 flex items-center gap-1">
          <Link href="/manual" className="hover:text-[#0067B8]">マニュアル</Link>
          <span>›</span>
          <span className="text-gray-600">{category.name}</span>
          {category.department && (
            <span className="ml-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {category.department}
            </span>
          )}
        </nav>

        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-500">中項目 {category.sections.length}件</p>
          <EditModeGate>
            <ManualSectionForm categoryId={categoryId} />
          </EditModeGate>
        </div>

        {category.sections.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100">
            <p className="text-3xl mb-3">📂</p>
            <p>中項目がまだありません</p>
            <p className="text-sm mt-1">編集モードで左のサイドバーの + から追加できます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {category.sections.map((section) => {
              // 一般ユーザーには下書きページを非表示
              const visiblePages = isAdmin
                ? section.pages
                : section.pages.filter((p) => !p.isDraft);

              return (
                <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {/* 中項目ヘッダー */}
                  <div className="flex items-center justify-between px-5 py-3.5 bg-[#F8FAFC] border-b border-gray-100">
                    <h3 className="font-semibold text-[#192E61] flex items-center gap-2 text-sm">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#0067B8]">
                        <path d="M3 7h18M3 12h18M3 17h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      {section.name}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{visiblePages.length}ページ</span>
                      <EditModeGate>
                        <Link
                          href={`/manual/${categoryId}/${section.id}/new`}
                          className="text-xs bg-[#E2EDF5] text-[#0067B8] px-3 py-1 rounded-lg hover:bg-[#d0e4f0] transition-colors"
                        >
                          + ページを追加
                        </Link>
                      </EditModeGate>
                    </div>
                  </div>

                  {/* ページ一覧 */}
                  {visiblePages.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-gray-400">ページがまだありません</p>
                  ) : (
                    <ul className="divide-y divide-gray-50">
                      {visiblePages.map((page) => {
                        const displayTitle = page.isDraft && page.draftTitle ? page.draftTitle : page.title;
                        return (
                          <li key={page.id}>
                            <Link
                              href={`/manual/${categoryId}/${section.id}/${page.id}`}
                              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-300 group-hover:text-[#0067B8] flex-shrink-0 transition-colors">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.8"/>
                                <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.8"/>
                              </svg>
                              <span className="text-sm text-gray-700 group-hover:text-[#0067B8] flex-1 transition-colors">
                                {displayTitle}
                              </span>
                              {page.isDraft && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium flex-shrink-0">
                                  下書き
                                </span>
                              )}
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {new Date(page.updatedAt).toLocaleDateString("ja-JP")}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
