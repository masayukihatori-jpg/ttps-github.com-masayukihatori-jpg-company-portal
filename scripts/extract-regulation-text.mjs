/**
 * 既存の規程PDFからテキストを一括抽出してDBに保存するスクリプト
 * 実行: node scripts/extract-regulation-text.mjs
 */
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// .env を手動で読む
import { readFileSync } from "fs";
const envContent = readFileSync(join(ROOT, ".env"), "utf8");
const env = Object.fromEntries(
  envContent.split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => {
      const idx = l.indexOf("=");
      const key = l.slice(0, idx).trim();
      const val = l.slice(idx + 1).trim().replace(/^"|"$/g, "");
      return [key, val];
    })
);

const DATABASE_URL = env.DATABASE_URL;
const UPLOAD_DIR = join(ROOT, "public", "uploads");

async function extractPdfText(filePath) {
  try {
    const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { getDocument, GlobalWorkerOptions } = pdfjsModule;
    // ワーカーを使わずにメインスレッドで処理
    GlobalWorkerOptions.workerSrc = new URL(
      "../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
      import.meta.url
    ).href;
    const buffer = await readFile(filePath);
    const uint8 = new Uint8Array(buffer);
    const doc = await getDocument({ data: uint8, verbosity: 0 }).promise;
    const texts = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      texts.push(pageText);
    }
    return texts.join("\n").trim();
  } catch (e) {
    console.error("  PDF抽出エラー:", e.message);
    return "";
  }
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

const { rows } = await client.query(
  `SELECT id, name, "storedName" FROM "Regulation" WHERE "textContent" IS NULL AND "storedName" IS NOT NULL`
);

console.log(`対象: ${rows.length} 件`);
let success = 0, fail = 0;

for (const reg of rows) {
  const filePath = join(UPLOAD_DIR, reg.storedName);
  process.stdout.write(`  [${reg.name}] 抽出中...`);
  const text = await extractPdfText(filePath);
  if (text.length > 0) {
    await client.query(
      `UPDATE "Regulation" SET "textContent" = $1 WHERE id = $2`,
      [text, reg.id]
    );
    console.log(` ✓ ${text.length}文字`);
    success++;
  } else {
    console.log(` ✗ テキストなし（スキャンPDF等）`);
    fail++;
  }
}

await client.end();
console.log(`\n完了: 成功 ${success} 件 / 失敗 ${fail} 件`);
