import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ユーザー一覧（管理者のみ）
export async function GET() {

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
