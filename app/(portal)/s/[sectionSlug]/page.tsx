import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Header from "@/components/layout/Header";

export default async function ContentSectionIndexPage({
  params,
}: {
  params: Promise<{ sectionSlug: string }>;
}) {
  const { sectionSlug } = await params;
  const section = await prisma.contentSection.findUnique({
    where: { slug: sectionSlug },
    include: { pages: { orderBy: { order: "asc" }, take: 1 } },
  });

  if (!section) notFound();

  if (section.pages.length === 0) {
    return (
      <>
        <Header title={section.name} />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-[#AAAAAA]">
            <p className="text-3xl mb-3">📄</p>
            <p className="text-sm font-medium text-gray-500">ページがありません</p>
            <p className="text-xs mt-2 text-gray-400">左のナビの「＋ ページを追加」からページを作成できます</p>
          </div>
        </main>
      </>
    );
  }

  redirect(`/s/${sectionSlug}/${section.pages[0].slug}`);
}
