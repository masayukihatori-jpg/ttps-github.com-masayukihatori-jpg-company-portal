import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import SectionPageEditor from "@/components/content-section/SectionPageEditor";

export const dynamic = "force-dynamic";

export default async function ContentSectionPage({
  params,
}: {
  params: Promise<{ sectionSlug: string; pageSlug: string }>;
}) {
  const { sectionSlug, pageSlug } = await params;

  const session = await auth();
  const currentUser = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email } })
    : null;

  const section = await prisma.contentSection.findUnique({ where: { slug: sectionSlug } });
  if (!section) notFound();

  const page = await prisma.contentSectionPage.findUnique({
    where: { sectionId_slug: { sectionId: section.id, slug: pageSlug } },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });

  if (!page) notFound();

  // 自分が下書き作成者かどうか
  const isMyDraft = !!currentUser && page.draftAuthorId === currentUser.id;

  // 公開済みファイルと下書きファイルを分離（下書き作成者のみ下書きファイルを受け取る）
  const liveFiles = page.files.filter((f) => !f.isDraft);
  const draftFiles = isMyDraft ? page.files.filter((f) => f.isDraft) : [];

  return (
    <>
      <Header title={page.title} />
      <main className="flex-1 pt-6 px-6 pb-6 overflow-y-auto">
        <SectionPageEditor
          key={pageSlug}
          apiBase={`/api/s/${sectionSlug}`}
          pageSlug={pageSlug}
          initialContent={page.content}
          initialEmbedUrl={page.embedUrl ?? ""}
          initialFiles={liveFiles.map((f) => ({
            id: f.id,
            name: f.name,
            url: f.url,
            size: f.size,
            mimeType: f.mimeType,
          }))}
          updatedAt={page.updatedAt.toISOString()}
          enableText={section.enableText}
          enableFiles={section.enableFiles}
          enableEmbed={section.enableEmbed}
          currentUserId={currentUser?.id ?? ""}
          draftAuthorId={page.draftAuthorId ?? null}
          draftContent={isMyDraft ? (page.draftContent ?? null) : null}
          draftEmbedUrl={isMyDraft ? (page.draftEmbedUrl ?? null) : null}
          draftFiles={draftFiles.map((f) => ({
            id: f.id,
            name: f.name,
            url: f.url,
            size: f.size,
            mimeType: f.mimeType,
          }))}
          draftUpdatedAt={isMyDraft && page.draftUpdatedAt ? page.draftUpdatedAt.toISOString() : null}
        />
      </main>
    </>
  );
}
