import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Anthropic } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, followUpQuestion, feedback } = await req.json();

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { answers: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
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

    const searchContent = [
      ...manualPages.map(
        (p) => `【${p.section.name}】${p.title}\n${p.content.slice(0, 500)}`
      ),
      ...regulations.map((r) => `【規程】${r.name}\n${r.textContent?.slice(0, 500) || ""}`),
    ].join("\n\n");

    // 再質問に対する回答を生成
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたは社内のマニュアル・規程に詳しいアシスタントです。
以下の情報に基づいてユーザーの追加質問に答えてください。

【利用可能なドキュメント】
${searchContent}

【前の質問と回答】
Q: ${question.question}
A: ${question.answers[0]?.answerText || ""}

ドキュメントに情報がない場合は「この情報は現在のドキュメントに記載されていません」と答えてください。`,
      messages: [
        {
          role: "user",
          content: followUpQuestion,
        },
      ],
    });

    const followUpAnswer =
      response.content[0].type === "text" ? response.content[0].text : "";

    // retryCountを増加
    const newRetryCount = question.retryCount + 1;

    // フォローアップを保存
    await prisma.followUp.create({
      data: {
        questionId,
        retryCount: newRetryCount,
        followUpQuestion,
        followUpAnswer,
      },
    });

    // 2回連続で「分からなかった」場合は自動エスカレーション
    if (feedback === "not_understood" && newRetryCount >= 2) {
      await prisma.question.update({
        where: { id: questionId },
        data: { status: "ESCALATED", retryCount: newRetryCount },
      });

      return NextResponse.json({
        followUpAnswer,
        escalated: true,
        message: "2回の再質問後、マニュアル管理者にエスカレーションされました",
      });
    }

    // ステータスを更新
    if (feedback === "not_understood") {
      await prisma.question.update({
        where: { id: questionId },
        data: { status: "FOLLOWUP", retryCount: newRetryCount },
      });
    } else {
      await prisma.question.update({
        where: { id: questionId },
        data: { status: "CLOSED", retryCount: newRetryCount },
      });
    }

    return NextResponse.json({
      followUpAnswer,
      escalated: newRetryCount >= 2 && feedback === "not_understood",
    });
  } catch (error) {
    console.error("Error in /api/qa/followup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
