import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const departments = await prisma.department.findMany({
    orderBy: { order: "asc" },
  });
  return NextResponse.json(departments);
}

export async function POST(request: NextRequest) {
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { name } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "部門名は必須です" }, { status: 400 });

  const last = await prisma.department.findFirst({ orderBy: { order: "desc" } });
  const department = await prisma.department.create({
    data: { name: name.trim(), order: (last?.order ?? 0) + 1 },
  });
  return NextResponse.json(department, { status: 201 });
}
