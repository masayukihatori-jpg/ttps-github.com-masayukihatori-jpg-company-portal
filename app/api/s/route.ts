import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

function autoSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  const suffix = randomBytes(3).toString("hex");
  return base ? `${base}-${suffix}` : suffix;
}

// セクション一覧取得
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const sections = await prisma.contentSection.findMany({
    orderBy: { order: "asc" },
    include: { pages: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(sections);
}

// セクション作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { name, slug: providedSlug, enableText, enableFiles, enableEmbed } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  }

  // 少なくとも1つのコンテンツタイプが必要
  const hasAnyType = enableText || enableFiles || enableEmbed;
  if (!hasAnyType) {
    return NextResponse.json({ error: "コンテンツタイプを1つ以上選択してください" }, { status: 400 });
  }

  // スラッグ：指定があれば使用、なければ自動生成
  let slug = providedSlug?.trim() || autoSlug(name);

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "スラッグは英小文字・数字・ハイフンのみ使用できます" }, { status: 400 });
  }

  // 重複チェック（自動生成の場合は再試行）
  let attempt = 0;
  while (attempt < 5) {
    const existing = await prisma.contentSection.findUnique({ where: { slug } });
    if (!existing) break;
    slug = autoSlug(name);
    attempt++;
  }

  // 最大orderを取得して末尾に追加
  const last = await prisma.contentSection.findFirst({ orderBy: { order: "desc" } });
  const order = (last?.order ?? -1) + 1;

  const section = await prisma.contentSection.create({
    data: {
      name: name.trim(),
      slug,
      order,
      enableText:  enableText  !== false,
      enableFiles: enableFiles !== false,
      enableEmbed: enableEmbed !== false,
    },
    include: { pages: true },
  });

  return NextResponse.json(section, { status: 201 });
}
