import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return NextResponse.json([]);

  const pages = await prisma.manualPage.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      content: true,
      section: {
        select: {
          id: true,
          name: true,
          category: {
            select: { id: true, name: true },
          },
        },
      },
    },
    take: 30,
  });

  const results = pages.map((p) => {
    // HTMLを除去してプレーンテキストにし、キーワード周辺を抜粋
    const plain = p.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const idx = plain.toLowerCase().indexOf(q.toLowerCase());
    const excerpt =
      idx >= 0
        ? "…" + plain.slice(Math.max(0, idx - 30), idx + q.length + 60) + "…"
        : plain.slice(0, 80) + (plain.length > 80 ? "…" : "");

    return {
      id: p.id,
      title: p.title,
      excerpt,
      sectionId: p.section.id,
      sectionName: p.section.name,
      categoryId: p.section.category.id,
      categoryName: p.section.category.name,
    };
  });

  return NextResponse.json(results);
}
