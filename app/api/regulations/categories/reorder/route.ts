import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// カテゴリの並び順を一括更新
export async function POST(request: NextRequest) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { ids } = await request.json() as { ids: string[] };
  await Promise.all(
    ids.map((id, index) =>
      prisma.regulationCategory.update({ where: { id }, data: { order: index + 1 } })
    )
  );
  return NextResponse.json({ success: true });
}
