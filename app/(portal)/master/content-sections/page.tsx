import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Header from "@/components/layout/Header";
import ContentSectionManager from "./ContentSectionManager";

export default async function ContentSectionsPage() {

  const sections = await prisma.contentSection.findMany({
    orderBy: { order: "asc" },
    include: { pages: { orderBy: { order: "asc" } } },
  });

  return (
    <>
      <Header title="カスタムセクション管理" />
      <main className="flex-1 p-6 max-w-2xl overflow-y-auto">
        <p className="text-sm text-gray-500 mb-5">
          会社情報と同じ形式（本文・リンク・ファイル・外部URL埋め込み）のセクションを自由に追加できます。
          追加したセクションはサイドバーに自動的に表示されます。
        </p>
        <ContentSectionManager initial={sections.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          hidden: s.hidden,
          enableText:  s.enableText,
          enableFiles: s.enableFiles,
          enableEmbed: s.enableEmbed,
          pages: s.pages.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
        }))} />
      </main>
    </>
  );
}
