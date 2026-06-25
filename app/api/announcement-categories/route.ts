import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const categories = await prisma.announcementCategoryMaster.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const { name, color } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "名前は必須です" }, { status: 400 });
  const last = await prisma.announcementCategoryMaster.findFirst({ orderBy: { order: "desc" } });
  const category = await prisma.announcementCategoryMaster.create({
    data: { name: name.trim(), color: color ?? "bg-gray-100 text-gray-700", order: (last?.order ?? -1) + 1 },
  });
  return NextResponse.json(category, { status: 201 });
}
