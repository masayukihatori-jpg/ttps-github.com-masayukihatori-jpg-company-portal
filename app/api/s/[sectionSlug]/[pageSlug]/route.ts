import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type Params = { params: Promise<{ sectionSlug: string; pageSlug: string }> };

// ページ取得
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { sectionSlug, pageSlug } = await params;
  const section = await prisma.contentSection.findUnique({ where: { slug: sectionSlug } });
  if (!section) return NextResponse.json({ error: "セクションが見つかりません" }, { status: 404 });

  const page = await prisma.contentSectionPage.findUnique({
    where: { sectionId_slug: { sectionId: section.id, slug: pageSlug } },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });

  if (!page) return NextResponse.json({ error: "ページが見つかりません" }, { status: 404 });
  return NextResponse.json(page);
}

// ページ更新（下書き保存 or 公開）
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { sectionSlug, pageSlug } = await params;
  const section = await prisma.contentSection.findUnique({ where: { slug: sectionSlug } });
  if (!section) return NextResponse.json({ error: "セクションが見つかりません" }, { status: 404 });

  const body = await request.json();
  const { content, urls, embedUrl, isDraft } = body;

  const page = await prisma.contentSectionPage.findUnique({
    where: { sectionId_slug: { sectionId: section.id, slug: pageSlug } },
  });
  if (!page) return NextResponse.json({ error: "ページが見つかりません" }, { status: 404 });

  if (isDraft) {
    // ── 下書き保存 ──
    const updated = await prisma.contentSectionPage.update({
      where: { id: page.id },
      data: {
        ...(content !== undefined && { draftContent: content }),
        ...(urls !== undefined && { draftUrls: urls }),
        ...(embedUrl !== undefined && { draftEmbedUrl: embedUrl || null }),
        draftAuthorId: user.id,
        draftUpdatedAt: new Date(),
      },
      include: { files: { orderBy: { createdAt: "asc" } } },
    });
    revalidatePath(`/s/${sectionSlug}/${pageSlug}`);
    return NextResponse.json(updated);
  } else {
    // ── 公開保存 ──
    // 自分の下書きがある場合はその内容を優先
    const isMyDraft = page.draftAuthorId === user.id;

    const publishContent = isMyDraft && page.draftContent !== null
      ? page.draftContent
      : (content !== undefined ? content : page.content);
    const publishUrls = isMyDraft && page.draftUrls !== null
      ? page.draftUrls
      : (urls !== undefined ? urls : page.urls);
    const publishEmbedUrl = isMyDraft && page.draftEmbedUrl !== null
      ? page.draftEmbedUrl
      : (embedUrl !== undefined ? (embedUrl || null) : page.embedUrl);

    // 自分の下書きファイルを公開ファイルに昇格
    if (isMyDraft) {
      await prisma.contentSectionFile.updateMany({
        where: { pageId: page.id, isDraft: true },
        data: { isDraft: false },
      });
    }

    const updated = await prisma.contentSectionPage.update({
      where: { id: page.id },
      data: {
        content: publishContent as string,
        urls: publishUrls as object,
        embedUrl: publishEmbedUrl as string | null,
        updatedBy: user.name ?? user.email,
        // 下書きをクリア（自分の下書きの場合のみ）
        ...(isMyDraft && {
          draftContent: null,
          draftEmbedUrl: null,
          draftUrls: Prisma.JsonNull,
          draftAuthorId: null,
          draftUpdatedAt: null,
        }),
      },
      include: { files: { orderBy: { createdAt: "asc" } } },
    });

    revalidatePath(`/s/${sectionSlug}/${pageSlug}`);
    return NextResponse.json(updated);
  }
}
