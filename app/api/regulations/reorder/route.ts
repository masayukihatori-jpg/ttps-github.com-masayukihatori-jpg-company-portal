import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ドラッグ後の並び順を一括更新
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  // ids: 新しい順番の ID 配列
  const { ids } = await request.json() as { ids: string[] };

  await Promise.all(
    ids.map((id, index) =>
      prisma.regulation.update({ where: { id }, data: { order: index + 1 } })
    )
  );

  return NextResponse.json({ success: true });
}
