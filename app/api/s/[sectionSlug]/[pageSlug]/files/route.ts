import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

type Params = { params: Promise<{ sectionSlug: string; pageSlug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { sectionSlug, pageSlug } = await params;
  const section = await prisma.contentSection.findUnique({ where: { slug: sectionSlug } });
  if (!section) return NextResponse.json({ error: "セクションが見つかりません" }, { status: 404 });

  const page = await prisma.contentSectionPage.findUnique({
    where: { sectionId_slug: { sectionId: section.id, slug: pageSlug } },
  });
  if (!page) return NextResponse.json({ error: "ページが見つかりません" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  // 下書きモードで追加されたファイルは isDraft: true
  const isDraft = formData.get("isDraft") === "true";

  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));

  const fileRecord = await prisma.contentSectionFile.create({
    data: {
      name: file.name,
      storedName,
      url: `/uploads/${storedName}`,
      size: file.size,
      mimeType: file.type,
      pageId: page.id,
      uploadedBy: user.name ?? user.email,
      isDraft,
    },
  });

  return NextResponse.json(fileRecord, { status: 201 });
}
