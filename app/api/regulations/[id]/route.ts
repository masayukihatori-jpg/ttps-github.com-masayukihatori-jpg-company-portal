import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

// 規程名変更
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;
  const { name } = await request.json();
  const regulation = await prisma.regulation.update({ where: { id }, data: { name } });
  return NextResponse.json(regulation);
}

// 規程削除
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;
  const regulation = await prisma.regulation.findUnique({ where: { id } });
  if (!regulation) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

  // ファイル削除
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", regulation.storedName));
  } catch {}

  await prisma.regulation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
