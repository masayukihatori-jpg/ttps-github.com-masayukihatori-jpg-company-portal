import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SectionLayout from "@/components/layout/SectionLayout";
import ContentSectionNav from "./ContentSectionNav";

export default async function ContentSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sectionSlug: string }>;
}) {
  const { sectionSlug } = await params;
  const section = await prisma.contentSection.findUnique({
    where: { slug: sectionSlug },
    include: {
      pages: {
        orderBy: { order: "asc" },
        include: { files: { select: { id: true, isDraft: true } } },
      },
    },
  });

  if (!section) notFound();

  return (
    <SectionLayout
      nav={
        <ContentSectionNav
          sectionSlug={sectionSlug}
          sectionName={section.name}
          pages={section.pages.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            // コンテンツが保存済みかどうか（閲覧ユーザーへの表示フラグ）
            hasContent: Boolean(p.content || p.embedUrl || p.files.filter((f) => !f.isDraft).length > 0),
          }))}
        />
      }
    >
      {children}
    </SectionLayout>
  );
}
