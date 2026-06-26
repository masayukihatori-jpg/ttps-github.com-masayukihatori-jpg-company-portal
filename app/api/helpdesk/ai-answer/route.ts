import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

/** HTMLタグを除去してプレーンテキストに変換 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(request: NextRequest) {
  const isAdmin = false;
    if (!session?.user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" }, { status: 500 });
  }

  const { nodeId, pathLabels, userInputs } = (await request.json()) as {
    nodeId: string;
    pathLabels: string[];
    userInputs?: { label: string; value: string }[];
  };

  // ノードと参照ドキュメントを取得
  const node = await prisma.helpdeskNode.findUnique({
    where: { id: nodeId },
    include: {
      manualPage: {
        include: { section: { include: { category: true } } },
      },
      regulation: true,
    },
  });

  if (!node) return NextResponse.json({ error: "ノードが見つかりません" }, { status: 404 });

  // コンテキストを構築
  const contextParts: string[] = [];

  // ログ記録用変数（ルートスコープ）
  let searchTerms: string[] = [];
  let regulations: { name: string; textContent: string | null }[] = [];
  let manualPages: { title: string; content: string; section: { name: string; category: { name: string } } }[] = [];

  if (node.manualPage) {
    const text = stripHtml(node.manualPage.content);
    if (text) {
      contextParts.push(
        `## マニュアル「${node.manualPage.section.category.name} › ${node.manualPage.section.name} › ${node.manualPage.title}」\n${text}`
      );
    }
  }

  if (node.regulation?.textContent) {
    contextParts.push(
      `## 規程「${node.regulation.name}」\n${node.regulation.textContent}`
    );
  }

  // 関連するコンテンツが何も紐づいていない場合は全マニュアル・規程から検索
  if (contextParts.length === 0) {
    // 日本語の助詞・助動詞・句読点で分割して意味のあるキーワードを抽出
    function extractKeywords(text: string): string[] {
      return text
        .replace(/[？！。、・\s　]+/g, " ")
        .split(/[はがをにでとのもへからまでよりにてについてにおいてにとって]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
    }

    // ユーザー入力がある場合はそれを優先、なければpathLabelsを使う
    const userInputTexts = userInputs?.filter((i) => i.value.trim()).map((i) => i.value) ?? [];
    const rawTerms = userInputTexts.length > 0 ? userInputTexts : pathLabels;
    // 各入力をキーワード分割して一意なリストにする
    searchTerms = [...new Set(rawTerms.flatMap(extractKeywords))];

    // 意味のあるキーワード（3文字以上）を上位2件に絞ってAND検索
    const meaningfulTerms = searchTerms
      .filter((t) => t.length >= 3)
      .sort((a, b) => b.length - a.length)
      .slice(0, 2);

    // AND検索（全キーワードを含む）→ ヒット0なら OR検索にフォールバック
    async function searchRegulations() {
      if (meaningfulTerms.length > 1) {
        // 意味のあるキーワードを全て含む規程を優先（取得数を多めに）
        const andResults = await prisma.regulation.findMany({
          where: {
            textContent: { not: null },
            AND: meaningfulTerms.map((term) => ({
              textContent: { contains: term, mode: "insensitive" as const },
            })),
          },
          take: 8,
        });
        if (andResults.length > 0) return andResults;
      }
      // フォールバック: いずれかのキーワードを含む
      return prisma.regulation.findMany({
        where: {
          textContent: { not: null },
          OR: searchTerms.flatMap((term) => [
            { name: { contains: term, mode: "insensitive" as const } },
            { textContent: { contains: term, mode: "insensitive" as const } },
          ]),
        },
        take: 4,
      });
    }

    async function searchManualPages() {
      if (meaningfulTerms.length > 1) {
        const andResults = await prisma.manualPage.findMany({
          where: {
            AND: meaningfulTerms.map((term) => ({
              OR: [
                { title: { contains: term, mode: "insensitive" as const } },
                { content: { contains: term, mode: "insensitive" as const } },
              ],
            })),
          },
          include: { section: { include: { category: true } } },
          take: 3,
        });
        if (andResults.length > 0) return andResults;
      }
      return prisma.manualPage.findMany({
        where: {
          OR: searchTerms.flatMap((term) => [
            { title: { contains: term, mode: "insensitive" as const } },
            { content: { contains: term, mode: "insensitive" as const } },
          ]),
        },
        include: { section: { include: { category: true } } },
        take: 3,
      });
    }

    const [foundManualPages, foundRegulations] = await Promise.all([
      searchManualPages(),
      searchRegulations(),
    ]);

    manualPages = foundManualPages;
    regulations = foundRegulations;

    for (const page of manualPages) {
      const text = stripHtml(page.content).slice(0, 2000);
      if (text) {
        contextParts.push(
          `## マニュアル「${page.section.category.name} › ${page.section.name} › ${page.title}」\n${text}`
        );
      }
    }
    for (const reg of regulations) {
      if (reg.textContent) {
        contextParts.push(
          `## 規程「${reg.name}」\n${reg.textContent.slice(0, 4000)}`
        );
      }
    }
  }

  // ユーザーへの質問文を構築
  const questionPath = pathLabels.join(" › ");
  let userMessage = `従業員から以下の問い合わせが届きました。\n\n【問い合わせ経路】\n${questionPath}`;

  if (userInputs && userInputs.length > 0) {
    const filled = userInputs.filter((i) => i.value.trim());
    if (filled.length > 0) {
      userMessage += `\n\n【入力内容】\n${filled.map((i) => `・${i.label}: ${i.value}`).join("\n")}`;
    }
  }

  if (contextParts.length > 0) {
    userMessage += `\n\n【参照資料】\n${contextParts.join("\n\n---\n\n")}`;
    userMessage += "\n\n上記の資料を参照して、従業員の問い合わせに対して日本語で具体的かつ丁寧に回答してください。";
  } else {
    userMessage += "\n\n参照できる社内資料がありませんでした。一般的な知識をもとに、丁寧に回答してください。";
  }

  // Anthropic API（ストリーミング）
  const client = new Anthropic({ apiKey });

  const stream = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system:
      "あなたは日本企業の社内ポータルに搭載されたヘルプデスクアシスタントです。" +
      "従業員からの問い合わせに対して、社内マニュアルや規程を参照しながら、正確・丁寧・簡潔に日本語で回答してください。" +
      "箇条書きや見出しを適切に使い、わかりやすく整理して回答してください。" +
      "社内資料に記載のない内容については「社内資料に該当情報が見つかりませんでした」と伝えてください。",
    messages: [{ role: "user", content: userMessage }],
    stream: true,
  });

  // テキストをストリーミングで返す
  let fullAnswer = "";
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullAnswer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
        const userEmail = session.user?.email;
        if (!userEmail) return;
        prisma.user.findUnique({ where: { email: userEmail } }).then(currentUser => {
          if (!currentUser) return;
          return prisma.helpdeskLog.create({
            data: {
              userId: currentUser.id,
              pathLabels: pathLabels,
              userInputs: userInputs ?? Prisma.JsonNull,
              searchTerms: searchTerms.length > 0 ? searchTerms : Prisma.JsonNull,
              contextRegs: regulations.length > 0 ? regulations.map(r => r.name) : (node.regulation ? [node.regulation.name] : Prisma.JsonNull),
              contextPages: manualPages.length > 0 ? manualPages.map(p => p.title) : (node.manualPage ? [node.manualPage.title] : Prisma.JsonNull),
              aiAnswer: fullAnswer,
            },
          });
        }).catch(console.error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
