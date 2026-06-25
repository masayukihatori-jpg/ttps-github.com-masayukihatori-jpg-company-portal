import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const { id } = await params;
  const page = await prisma.manualPage.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      section: { include: { category: true } },
    },
  });
  if (!page) return NextResponse.json({ error: "見つかりません" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;
  let title: string | undefined;
  let content: string | undefined;
  let isDraft: boolean | undefined;
  try {
    const body = await request.json();
    title = body.title;
    content = body.content;
    isDraft = body.isDraft;
  } catch {
    return NextResponse.json({ error: "リクエストの解析に失敗しました（本文が大きすぎる可能性があります）" }, { status: 400 });
  }

  try {
    let updateData: any = {};

    if (isDraft === true) {
      // 下書き保存：draftフィールドに保存
      updateData = {
        isDraft: true,
        ...(title !== undefined && { draftTitle: title }),
        ...(content !== undefined && { draftContent: content }),
        draftAuthorId: user.id,
        draftUpdatedAt: new Date(),
      };
    } else if (isDraft === false) {
      // 公開：liveフィールドにマージし、draftフィールドをクリア
      updateData = {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        isDraft: false,
        draftTitle: null,
        draftContent: null,
        draftAuthorId: null,
        draftUpdatedAt: null,
      };
    } else {
      // isDraft指定なし → 従来通り直接更新
      updateData = {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
      };
    }

    const page = await prisma.manualPage.update({ where: { id }, data: updateData });
    return NextResponse.json(page);
  } catch (e) {
    console.error("manualPage update error:", e);
    return NextResponse.json({ error: "データベースへの保存に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;
  await prisma.manualPage.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
