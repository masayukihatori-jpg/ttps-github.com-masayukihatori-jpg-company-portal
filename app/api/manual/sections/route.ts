import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { name, description, categoryId } = await request.json();
  if (!name || !categoryId) return NextResponse.json({ error: "名前とカテゴリは必須です" }, { status: 400 });

  const last = await prisma.manualSection.findFirst({ where: { categoryId }, orderBy: { order: "desc" } });
  const section = await prisma.manualSection.create({
    data: { name, description, categoryId, order: (last?.order ?? 0) + 1 },
  });
  return NextResponse.json(section, { status: 201 });
}
