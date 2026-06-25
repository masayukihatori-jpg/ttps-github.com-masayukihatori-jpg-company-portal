import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

type Params = { params: Promise<{ sectionSlug: string; pageId: string }> };

// ページ更新（タイトルのみ）
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { pageId } = await params;
  const { title } = await request.json();

  const page = await prisma.contentSectionPage.update({
    where: { id: pageId },
    data: { ...(title !== undefined && { title }) },
  });

  return NextResponse.json(page);
}

// ページ削除（ファイルも含めて）
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { pageId } = await params;

  // 添付ファイルを物理削除
  const files = await prisma.contentSectionFile.findMany({ where: { pageId } });
  await Promise.all(
    files.map((f) =>
      unlink(path.join(process.cwd(), "public", "uploads", f.storedName)).catch(() => {})
    )
  );

  await prisma.contentSectionPage.delete({ where: { id: pageId } });
  return new NextResponse(null, { status: 204 });
}
