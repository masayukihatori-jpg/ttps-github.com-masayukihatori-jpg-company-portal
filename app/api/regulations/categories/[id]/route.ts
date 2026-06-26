import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

// カテゴリ名変更
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;
  const { name } = await request.json();
  const category = await prisma.regulationCategory.update({ where: { id }, data: { name } });
  return NextResponse.json(category);
}

// カテゴリ削除（配下の規程ファイルも削除）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;

  // 配下の規程ファイルを物理削除
  const regulations = await prisma.regulation.findMany({ where: { categoryId: id } });
  await Promise.all(
    regulations.map(async (r) => {
      try {
        await unlink(path.join(process.cwd(), "public", "uploads", r.storedName));
      } catch {}
    })
  );

  // DB削除（cascadeで規程も消える）
  await prisma.regulationCategory.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
