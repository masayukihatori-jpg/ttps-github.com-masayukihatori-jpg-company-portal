import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const categories = await prisma.manualCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { pages: { orderBy: { order: "asc" }, select: { id: true, title: true, order: true } } },
      },
    },
  });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { name, description, department } = await request.json();
  if (!name) return NextResponse.json({ error: "名前は必須です" }, { status: 400 });

  const last = await prisma.manualCategory.findFirst({ orderBy: { order: "desc" } });
  const category = await prisma.manualCategory.create({
    data: { name, description, department: department ?? null, order: (last?.order ?? 0) + 1 },
  });
  return NextResponse.json(category, { status: 201 });
}
