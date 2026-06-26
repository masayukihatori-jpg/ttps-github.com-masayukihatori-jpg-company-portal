import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// カテゴリ一覧（規程も含む）
export async function GET() {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const categories = await prisma.regulationCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      regulations: { orderBy: { order: "asc" } },
    },
  });
  return NextResponse.json(categories);
}

// カテゴリ追加
export async function POST(request: NextRequest) {
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "カテゴリ名は必須です" }, { status: 400 });

  const last = await prisma.regulationCategory.findFirst({ orderBy: { order: "desc" } });
  const category = await prisma.regulationCategory.create({
    data: { name: name.trim(), order: (last?.order ?? 0) + 1 },
    include: { regulations: true },
  });
  return NextResponse.json(category, { status: 201 });
}
