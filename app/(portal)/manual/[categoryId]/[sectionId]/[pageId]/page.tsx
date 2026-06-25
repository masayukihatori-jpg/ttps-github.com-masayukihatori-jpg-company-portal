import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { notFound } from "next/navigation";
import ManualPageDeleteButton from "./ManualPageDeleteButton";
import { EditModeGate } from "@/components/layout/EditModeGate";

export default async function ManualPageView({
  params,
}: {
  params: Promise<{ categoryId: string; sectionId: string; pageId: string }>;
}) {
  const { categoryId, sectionId, pageId } = await params;
  const session = await auth();
  const [user, page] = await Promise.all([
    prisma.user.findUnique({ where: { email: session?.user?.email! } }),
    prisma.manualPage.findUnique({
      where: { id: pageId },
      include: {
        author: { select: { name: true } },
        section: { include: { category: true } },
      },
    }),
  ]);

  if (!page) notFound();
  const isAdmin = user?.role === "ADMIN";

  // 下書きページは一般ユーザーからアクセス不可
  if (page.isDraft && !isAdmin) notFound();

  // 同じセクション内の前後ページ（一般ユーザーは下書き除外）
  const allSiblings = await prisma.manualPage.findMany({
    where: { sectionId },
    orderBy: { order: "asc" },
    select: { id: true, title: true, isDraft: true },
  });
  const siblings = isAdmin ? allSiblings : allSiblings.filter((p) => !p.isDraft);
  const currentIdx = siblings.findIndex((p) => p.id === pageId);
  const prev = siblings[currentIdx - 1] ?? null;
  const next = siblings[currentIdx + 1] ?? null;

  // 表示タイトルとコンテンツ（下書き中の場合はdraftフィールドを優先）
  const displayTitle = page.isDraft && page.draftTitle ? page.draftTitle : page.title;
  const displayContent = page.isDraft && page.draftContent ? page.draftContent : page.content;

  return (
    <>
      <Header title={displayTitle} />
      <main className="flex-1 p-6">
        {/* パンくず */}
        <nav className="text-sm text-gray-400 mb-5 flex items-center gap-1 flex-wrap">
          <Link href="/manual" className="hover:text-[#0067B8]">マニュアル</Link>
          <span>›</span>
          <Link href={`/manual/${categoryId}`} className="hover:text-[#0067B8]">
            {page.section.category.name}
          </Link>
          <span>›</span>
          <Link href={`/manual/${categoryId}/${sectionId}`} className="hover:text-[#0067B8]">
            {page.section.name}
          </Link>
          <span>›</span>
          <span className="text-gray-600">{displayTitle}</span>
        </nav>

        {/* 下書きバナー（管理者のみ） */}
        {page.isDraft && isAdmin && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <span className="text-sm text-amber-700">下書きが保存されています</span>
            <Link
              href={`/manual/${categoryId}/${sectionId}/${pageId}/edit`}
              className="text-xs bg-[#0067B8] text-white px-3 py-1.5 rounded-lg hover:bg-[#005a9e] transition-colors"
            >
              公開する
            </Link>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* ヘッダー：タイトル + 編集ボタン */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-[#E2EDF5] text-[#0067B8] px-2.5 py-1 rounded-full font-medium">
                {page.section.category.name}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {page.section.name}
              </span>
              {page.isDraft && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  下書き
                </span>
              )}
            </div>
            <EditModeGate>
              <div className="flex gap-2 ml-4">
                <Link
                  href={`/manual/${categoryId}/${sectionId}/${pageId}/edit`}
                  className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  編集
                </Link>
                <ManualPageDeleteButton id={pageId} categoryId={categoryId} />
              </div>
            </EditModeGate>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{displayTitle}</h1>

          {/* 日時 */}
          <div className="pb-5 border-b border-gray-100 mb-5">
            <p className="text-xs text-gray-400">
              {new Date(page.updatedAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })} 更新
            </p>
          </div>

          {/* 本文 */}
          {displayContent ? (
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed
                prose-headings:font-semibold prose-headings:text-gray-800
                prose-h2:text-base prose-h3:text-sm
                prose-a:text-[#0067B8] prose-a:underline
                prose-ul:list-disc prose-ul:pl-5
                prose-ol:list-decimal prose-ol:pl-5
                prose-img:rounded-lg prose-img:max-w-full"
              dangerouslySetInnerHTML={{ __html: displayContent }}
            />
          ) : (
            <div className="min-h-32 flex items-center">
              <span className="text-gray-300 text-sm">本文がありません</span>
            </div>
          )}
        </div>

        {/* 前後ナビゲーション */}
        <div className="flex gap-4 mt-5">
          {prev ? (
            <Link
              href={`/manual/${categoryId}/${sectionId}/${prev.id}`}
              className="flex-1 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow text-sm"
            >
              <span className="text-gray-400 text-xs">← 前のページ</span>
              <p className="text-gray-700 font-medium mt-0.5 truncate">{prev.title}</p>
            </Link>
          ) : <div className="flex-1" />}
          {next ? (
            <Link
              href={`/manual/${categoryId}/${sectionId}/${next.id}`}
              className="flex-1 bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow text-sm text-right"
            >
              <span className="text-gray-400 text-xs">次のページ →</span>
              <p className="text-gray-700 font-medium mt-0.5 truncate">{next.title}</p>
            </Link>
          ) : <div className="flex-1" />}
        </div>
      </main>
    </>
  );
}
