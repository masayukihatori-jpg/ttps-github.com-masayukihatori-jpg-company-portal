import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { fileId } = await params;
  const file = await prisma.companyInfoFile.findUnique({ where: { id: fileId } });
  if (!file) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });

  // 実ファイル削除
  try {
    await unlink(path.join(process.cwd(), "public", "uploads", file.storedName));
  } catch {}

  await prisma.companyInfoFile.delete({ where: { id: fileId } });
  return NextResponse.json({ success: true });
}
