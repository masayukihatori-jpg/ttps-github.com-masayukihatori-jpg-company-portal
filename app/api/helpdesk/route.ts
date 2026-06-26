import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const { question } = await request.json() as { question: string };
  if (!question?.trim()) return NextResponse.json({ error: "質問を入力してください" }, { status: 400 });

  // ── 参照ソースを収集 ──

  // 1. マニュアルページ（全テキスト）
  const manualPages = await prisma.manualPage.findMany({
    include: {
      section: { include: { category: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 2. 規程PDFのテキスト
  const regulations = await prisma.regulation.findMany({
    where: { textContent: { not: null } },
    include: { category: true },
  });

  // ── コンテキスト構築 ──
  const manualContext = manualPages
    .filter((p) => p.content?.trim())
    .map((p) => {
      const plain = p.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return `【マニュアル】${p.section.category.name} > ${p.section.name} > ${p.title}\n${plain.slice(0, 1500)}`;
    })
    .join("\n\n---\n\n");

  const regulationContext = regulations
    .map((r) => `【規程】${r.category.name} > ${r.name}\n${r.textContent!.slice(0, 1500)}`)
    .join("\n\n---\n\n");

  const fullContext = [manualContext, regulationContext].filter(Boolean).join("\n\n===\n\n");

  if (!fullContext.trim()) {
    return NextResponse.json({
      answer: "現在、参照できるマニュアル・規程のデータがありません。管理者にコンテンツを追加してもらってください。",
      sources: [],
    });
  }

  // ── Claude に回答を生成させる ──
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      answer: "AI回答機能を使用するには、ANTHROPIC_API_KEY の設定が必要です。",
      sources: [],
    });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `あなたは社内ポータルのヘルプデスクアシスタントです。
以下の社内マニュアル・規程を参照して、社員の質問に回答してください。

【参照資料】
${fullContext}

【質問】
${question}

【回答のルール】
- 参照資料に基づいて正確に回答する
- 参照資料に情報がない場合は「マニュアル・規程には記載がありません」と明示する
- 回答は簡潔にまとめ、重要なポイントは箇条書きにする
- 参照したマニュアル/規程のタイトルを「参照元:」として最後に明記する
- 日本語で回答する`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const answer = message.content[0].type === "text" ? message.content[0].text : "回答を生成できませんでした。";

  // ── 使用したソースをリスト化 ──
  const sources: { type: "manual" | "regulation"; title: string; path?: string }[] = [];

  if (manualContext) {
    manualPages
      .filter((p) => p.content?.trim())
      .slice(0, 5)
      .forEach((p) => {
        sources.push({
          type: "manual",
          title: `${p.section.category.name} › ${p.section.name} › ${p.title}`,
          path: `/manual/${p.section.categoryId}/${p.sectionId}/${p.id}`,
        });
      });
  }
  regulations.forEach((r) => {
    sources.push({ type: "regulation", title: `${r.category.name} › ${r.name}`, path: r.url });
  });

  return NextResponse.json({ answer, sources });
}
