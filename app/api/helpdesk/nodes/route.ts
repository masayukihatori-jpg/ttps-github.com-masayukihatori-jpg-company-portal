import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ツリー全体を取得（フラット → ツリー変換はクライアントで）
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

    const nodes = await prisma.helpdeskNode.findMany({
      orderBy: [{ depth: "asc" }, { order: "asc" }],
      include: {
        manualPage: {
          include: { section: { include: { category: true } } },
        },
        regulation: { include: { category: true } },
      },
    });
    return NextResponse.json(nodes);
  } catch (e) {
    console.error("[GET /api/helpdesk/nodes] error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ノード作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const body = await request.json();
  const { label, parentId, depth, order, nodeType } = body;

  const node = await prisma.helpdeskNode.create({
    data: { label, parentId: parentId ?? null, depth: depth ?? 0, order: order ?? 0, nodeType: nodeType ?? "choice" },
    include: {
      manualPage: { include: { section: { include: { category: true } } } },
      regulation: { include: { category: true } },
    },
  });
  return NextResponse.json(node, { status: 201 });
}
