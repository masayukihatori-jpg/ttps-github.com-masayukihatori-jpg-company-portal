import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const category = await prisma.announcementCategoryMaster.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.color && { color: body.color }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  const { id } = await params;
  await prisma.announcementCategoryMaster.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
