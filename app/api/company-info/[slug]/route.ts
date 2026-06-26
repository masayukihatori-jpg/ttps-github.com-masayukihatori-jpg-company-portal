import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getPageMeta } from "@/lib/company-info";
import type { Prisma } from "@prisma/client";

// ページ取得（なければ自動作成）
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { slug } = await params;
  const meta = getPageMeta(slug);
  if (!meta) return NextResponse.json({ error: "ページが見つかりません" }, { status: 404 });

  let page = await prisma.companyInfoPage.findUnique({
    where: { slug },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });

  // 初回アクセス時に自動作成
  if (!page) {
    page = await prisma.companyInfoPage.create({
      data: { slug, title: meta.title, content: "", urls: [] },
      include: { files: true },
    });
  }

  return NextResponse.json(page);
}

// ページ更新（本文・URL）
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { slug } = await params;
  const body = await request.json();
  const { content, urls, embedUrl, isDraft } = body;

  if (isDraft === true) {
    // 下書き保存：draftフィールドに保存
    const page = await prisma.companyInfoPage.upsert({
      where: { slug },
      create: {
        slug,
        title: getPageMeta(slug)?.title ?? slug,
        content: "",
        urls: [],
        draftContent: content ?? "",
        draftEmbedUrl: embedUrl ?? null,
        draftUrls: urls ?? [],
        draftAuthorId: user.id,
        draftUpdatedAt: new Date(),
      },
      update: {
        ...(content !== undefined && { draftContent: content }),
        ...(urls !== undefined && { draftUrls: urls }),
        ...(embedUrl !== undefined && { draftEmbedUrl: embedUrl || null }),
        draftAuthorId: user.id,
        draftUpdatedAt: new Date(),
      },
      include: { files: true },
    });
    revalidatePath(`/company-info/${slug}`);
    return NextResponse.json(page);
  } else if (isDraft === false) {
    // 公開：liveフィールドに反映し、draftフィールドをクリア
    const page = await prisma.companyInfoPage.upsert({
      where: { slug },
      create: {
        slug,
        title: getPageMeta(slug)?.title ?? slug,
        content: content ?? "",
        urls: urls ?? [],
        ...(embedUrl !== undefined && { embedUrl: embedUrl || null }),
        updatedBy: user.name ?? user.email,
        draftContent: null,
        draftEmbedUrl: null,
        draftUrls: Prisma.JsonNull,
        draftAuthorId: null,
        draftUpdatedAt: null,
      },
      update: {
        ...(content !== undefined && { content }),
        ...(urls !== undefined && { urls }),
        ...(embedUrl !== undefined && { embedUrl: embedUrl || null }),
        updatedBy: user.name ?? user.email,
        draftContent: null,
        draftEmbedUrl: null,
        draftUrls: Prisma.JsonNull,
        draftAuthorId: null,
        draftUpdatedAt: null,
      },
      include: { files: true },
    });
    // 下書きファイルを公開ファイルに昇格
    await prisma.companyInfoFile.updateMany({
      where: { pageId: page.id, isDraft: true },
      data: { isDraft: false },
    });
    revalidatePath(`/company-info/${slug}`);
    return NextResponse.json(page);
  } else {
    // isDraft 指定なし → 従来通り直接公開保存
    const page = await prisma.companyInfoPage.upsert({
      where: { slug },
      create: {
        slug,
        title: getPageMeta(slug)?.title ?? slug,
        content: content ?? "",
        urls: urls ?? [],
        ...(embedUrl !== undefined && { embedUrl: embedUrl || null }),
      },
      update: {
        ...(content !== undefined && { content }),
        ...(urls !== undefined && { urls }),
        ...(embedUrl !== undefined && { embedUrl: embedUrl || null }),
        updatedBy: user.name ?? user.email,
      },
      include: { files: true },
    });
    revalidatePath(`/company-info/${slug}`);
    return NextResponse.json(page);
  }
}
