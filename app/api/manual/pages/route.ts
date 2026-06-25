import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { title, content, sectionId, isDraft } = await request.json();
  if (!title || !sectionId) return NextResponse.json({ error: "タイトルとセクションは必須です" }, { status: 400 });

  const last = await prisma.manualPage.findFirst({ where: { sectionId }, orderBy: { order: "desc" } });

  const page = await prisma.manualPage.create({
    data: {
      title: isDraft ? "" : title,
      content: isDraft ? "" : (content ?? ""),
      sectionId,
      authorId: user.id,
      order: (last?.order ?? 0) + 1,
      isDraft: isDraft ?? false,
      ...(isDraft && {
        draftTitle: title,
        draftContent: content ?? "",
        draftAuthorId: user.id,
        draftUpdatedAt: new Date(),
      }),
    },
  });
  return NextResponse.json(page, { status: 201 });
}
