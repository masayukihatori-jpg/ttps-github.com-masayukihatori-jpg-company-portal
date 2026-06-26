import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPageMeta } from "@/lib/company-info";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const { slug } = await params;
  const meta = getPageMeta(slug);
  if (!meta) return NextResponse.json({ error: "ページが見つかりません" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  const isDraft = formData.get("isDraft") === "true";

  // ページが存在しなければ作成
  let page = await prisma.companyInfoPage.findUnique({ where: { slug } });
  if (!page) {
    page = await prisma.companyInfoPage.create({
      data: { slug, title: meta.title, content: "", urls: [] },
    });
  }

  // ファイル保存
  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));

  const fileRecord = await prisma.companyInfoFile.create({
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
