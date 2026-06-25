import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ユーザー一覧（管理者のみ）
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      department: true,
      position: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}
