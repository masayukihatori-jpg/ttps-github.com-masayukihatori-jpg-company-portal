import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ノード更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { label, question, answerText, manualPageId, regulationId, order, nodeType, useAiAnswer } = body;

  const node = await prisma.helpdeskNode.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(question !== undefined && { question: question || null }),
      ...(answerText !== undefined && { answerText: answerText || null }),
      ...(manualPageId !== undefined && { manualPageId: manualPageId || null }),
      ...(regulationId !== undefined && { regulationId: regulationId || null }),
      ...(order !== undefined && { order }),
      ...(nodeType !== undefined && { nodeType }),
      ...(useAiAnswer !== undefined && { useAiAnswer }),
      updatedAt: new Date(),
    },
    include: {
      manualPage: { include: { section: { include: { category: true } } } },
      regulation: { include: { category: true } },
    },
  });
  return NextResponse.json(node);
}

// ノード削除（子も cascade で消える）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { id } = await params;
  await prisma.helpdeskNode.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
