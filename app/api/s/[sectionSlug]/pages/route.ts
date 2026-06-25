import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

type Params = { params: Promise<{ sectionSlug: string }> };

/** タイトルからURLスラッグを自動生成（日本語はランダムIDにフォールバック） */
function autoSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")   // 英数字・スペース・ハイフン以外を除去
    .replace(/[\s_]+/g, "-")    // スペース→ハイフン
    .replace(/^-+|-+$/g, "")    // 先頭末尾のハイフンを除去
    .slice(0, 30);
  const suffix = randomBytes(3).toString("hex"); // 6文字のランダム文字列
  return base ? `${base}-${suffix}` : suffix;
}

// ページ作成
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { sectionSlug } = await params;
  const section = await prisma.contentSection.findUnique({ where: { slug: sectionSlug } });
  if (!section) return NextResponse.json({ error: "セクションが見つかりません" }, { status: 404 });

  const { title } = await request.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }

  // スラッグを自動生成（重複しないまで再試行）
  let slug = autoSlug(title);
  let attempt = 0;
  while (attempt < 5) {
    const existing = await prisma.contentSectionPage.findUnique({
      where: { sectionId_slug: { sectionId: section.id, slug } },
    });
    if (!existing) break;
    slug = autoSlug(title); // 再生成
    attempt++;
  }

  const last = await prisma.contentSectionPage.findFirst({
    where: { sectionId: section.id },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? -1) + 1;

  const page = await prisma.contentSectionPage.create({
    data: { sectionId: section.id, slug, title: title.trim(), content: "", urls: [], order },
  });

  return NextResponse.json(page, { status: 201 });
}
