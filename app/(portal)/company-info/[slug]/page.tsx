import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getPageMeta } from "@/lib/company-info";
import Header from "@/components/layout/Header";
import CompanyInfoEditor from "./CompanyInfoEditor";

export const dynamic = "force-dynamic";

export default async function CompanyInfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = getPageMeta(slug);
  if (!meta) notFound();

  const isAdmin = user?.role === "ADMIN";

  // ページデータ取得（なければ自動作成）
  let page = await prisma.companyInfoPage.findUnique({
    where: { slug },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });
  if (!page) {
    page = await prisma.companyInfoPage.create({
      data: { slug, title: meta.title, content: "", urls: [] },
      include: { files: true },
    });
  }

  // 非管理者 かつ 埋め込みURLあり → サーバー側で直接 iframe を返す（state不使用で確実）
  if (page.embedUrl && !isAdmin) {
    return (
      <>
        <Header title={`${meta.icon} ${meta.title}`} />
        <main className="flex-1 flex flex-col overflow-hidden">
          <iframe
            src={page.embedUrl}
            className="w-full flex-1 border-0"
            style={{ height: "100%" }}
            title="外部サイト"
          />
        </main>
      </>
    );
  }

  // 一般ユーザーはisDraftファイルを除外
  const visibleFiles = page.files.filter((f) => isAdmin || !f.isDraft);

  return (
    <>
      <Header title={`${meta.icon} ${meta.title}`} />
      <main className="flex-1 flex flex-col overflow-hidden p-6">
        <CompanyInfoEditor
          key={slug}
          slug={slug}
          initialContent={page.content}
          initialEmbedUrl={page.embedUrl ?? ""}
          initialUrls={page.urls as { label: string; url: string }[]}
          initialFiles={visibleFiles.map((f) => ({
            id: f.id,
            name: f.name,
            url: f.url,
            size: f.size,
            mimeType: f.mimeType,
            isDraft: f.isDraft,
          }))}
          updatedAt={page.updatedAt.toISOString()}
          currentUserId={user?.id ?? ""}
          draftAuthorId={page.draftAuthorId ?? null}
          draftContent={page.draftContent ?? null}
          draftEmbedUrl={page.draftEmbedUrl ?? null}
          draftUrls={page.draftUrls as { label: string; url: string }[] | null}
          draftUpdatedAt={page.draftUpdatedAt?.toISOString() ?? null}
        />
      </main>
    </>
  );
}
