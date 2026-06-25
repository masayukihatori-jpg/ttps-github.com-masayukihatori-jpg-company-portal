import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticationRequired } from "@/lib/auth-settings";

export async function GET() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email! },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ authenticationRequired: getAuthenticationRequired() });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { email: session?.user?.email! },
  });

  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { authenticationRequired: newValue } = await req.json();

  // 注意: 実行時の設定変更はメモリのみ。
  // 永続的な変更には環境変数の更新またはデータベース保存が必要
  process.env.AUTHENTICATION_REQUIRED = newValue ? "true" : "false";

  return NextResponse.json({ authenticationRequired: newValue });
}
