import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ sectionSlug: string; pageSlug: string; fileId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { fileId } = await params;
  const file = await prisma.contentSectionFile.findUnique({ where: { id: fileId } });
  if (!file) return NextResponse.json({ error: "ファイルが見つかりません" }, { status: 404 });

  // 物理ファイル削除
  await unlink(path.join(process.cwd(), "public", "uploads", file.storedName)).catch(() => {});
  await prisma.contentSectionFile.delete({ where: { id: fileId } });

  return new NextResponse(null, { status: 204 });
}
