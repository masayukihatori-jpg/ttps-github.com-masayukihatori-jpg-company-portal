import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    GlobalWorkerOptions.workerSrc = new URL(
      "../../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url
    ).href;
    const buffer = await readFile(filePath);
    const uint8 = new Uint8Array(buffer);
    const doc = await getDocument({ data: uint8, verbosity: 0 }).promise;
    const texts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      texts.push(pageText);
    }
    return texts.join("\n").trim().slice(0, 20000);
  } catch {
    return "";
  }
}

// 規程一覧（カテゴリ付き）
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const categories = await prisma.regulationCategory.findMany({
    orderBy: { order: "asc" },
    include: { regulations: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(categories);
}

// 規程（PDF）アップロード
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "権限がありません" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const name = (formData.get("name") as string) || file?.name.replace(/\.pdf$/i, "");
  const categoryId = formData.get("categoryId") as string;

  if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  if (!file.type.includes("pdf")) return NextResponse.json({ error: "PDFファイルのみアップロードできます" }, { status: 400 });
  if (!categoryId) return NextResponse.json({ error: "カテゴリを指定してください" }, { status: 400 });

  // カテゴリ内の最大orderを取得
  const last = await prisma.regulation.findFirst({
    where: { categoryId },
    orderBy: { order: "desc" },
  });

  const storedName = `${randomUUID()}.pdf`;
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const fileSavePath = path.join(uploadDir, storedName);
  const bytes = await file.arrayBuffer();
  await writeFile(fileSavePath, Buffer.from(bytes));

  // PDFからテキストを抽出（ヘルプデスク検索用）
  const textContent = await extractPdfText(fileSavePath);

  const regulation = await prisma.regulation.create({
    data: {
      name,
      fileName: file.name,
      storedName,
      url: `/uploads/${storedName}`,
      size: file.size,
      order: (last?.order ?? 0) + 1,
      categoryId,
      textContent: textContent || null,
      uploadedBy: user.name ?? user.email,
    },
  });

  return NextResponse.json(regulation, { status: 201 });
}
