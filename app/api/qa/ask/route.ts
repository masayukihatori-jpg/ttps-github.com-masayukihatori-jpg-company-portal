import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { question, userId } = await req.json();
    if (!question) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    // マニュアル、規程を検索対象として取得
    const [manualPages, regulations] = await Promise.all([
      prisma.manualPage.findMany({
        where: { isDraft: false },
        include: { section: true },
      }),
      prisma.regulation.findMany(),
    ]);

    // 検索コンテンツの準備
    const searchContent = [
      ...manualPages.map(
        (p) => `【${p.section.name}】${p.title}\n${p.content.slice(0, 500)}`
      ),
      ...regulations.map((r) => `【規程】${r.name}\n${r.textContent?.slice(0, 500) || ""}`),
    ].join("\n\n");

    console.log("Fetching manuals and regulations...");
    console.log(`Found ${manualPages.length} manual pages and ${regulations.length} regulations`);

    // RAG: Claude にコンテンツ内で回答させる
    console.log("Calling Claude API...");
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたは社内のマニュアル・規程に詳しいアシスタントです。
以下の社内ドキュメントに基づいて、ユーザーの質問に答えてください。
回答には参照したドキュメント名を明記してください。

【利用可能なドキュメント】
${searchContent}

ドキュメントに情報がない場合は「この情報は現在のドキュメントに記載されていません」と答えてください。`,
      messages: [
        {
          role: "user",
          content: question,
        },
      ],
    });

    console.log("Claude API response received");
    const answerText =
      response.content[0].type === "text" ? response.content[0].text : "";
    console.log("Answer:", answerText);

    // データベースに保存
    const newQuestion = await prisma.question.create({
      data: {
        userId: user.id,
        question,
        status: "AI_ANSWERED",
        answers: {
          create: {
            answerText,
            sourceUrls: JSON.stringify([]),
            aiModel: "claude",
          },
        },
      },
      include: {
        answers: true,
      },
    });

    return NextResponse.json({ question: newQuestion, answer: answerText });
  } catch (error) {
    console.error("Error in /api/qa/ask:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error details:", errorMessage);
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
