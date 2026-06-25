import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ sectionSlug: string }> };

// セクション情報取得（ページ一覧含む）
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { sectionSlug } = await params;
  const section = await prisma.contentSection.findUnique({
    where: { slug: sectionSlug },
    include: { pages: { orderBy: { order: "asc" } } },
  });

  if (!section) return NextResponse.json({ error: "セクションが見つかりません" }, { status: 404 });
  return NextResponse.json(section);
}

// セクション情報更新（名前・順序）
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { sectionSlug } = await params;
  const { name, hidden, order } = await request.json();

  const section = await prisma.contentSection.update({
    where: { slug: sectionSlug },
    data: {
      ...(name   !== undefined && { name }),
      ...(hidden !== undefined && { hidden }),
      ...(order  !== undefined && { order }),
    },
    include: { pages: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(section);
}

// セクション削除
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { sectionSlug } = await params;
  await prisma.contentSection.delete({ where: { slug: sectionSlug } });
  return new NextResponse(null, { status: 204 });
}
