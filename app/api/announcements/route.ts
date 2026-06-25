import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSlackNotification } from "@/lib/slack";
import { summarizeAnnouncement } from "@/lib/summarize";

// お知らせ一覧取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email! } });
  const isAdmin = user?.role === "ADMIN";

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const category = searchParams.get("category");

  // 一般ユーザーは下書きを除外
  const where: any = category ? { category: category as any } : {};
  if (!isAdmin) {
    where.isDraft = false;
  }

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        author: {
          select: { name: true, image: true, department: true },
        },
      },
      orderBy: [{ important: "desc" }, { publishedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.announcement.count({ where }),
  ]);

  return NextResponse.json({ announcements, total, page, limit });
}

// お知らせ新規作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 管理者チェック
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "投稿権限がありません（管理者のみ）" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { title, content, category, important, organization, isDraft } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: "タイトルと内容は必須です" },
      { status: 400 }
    );
  }

  if (!organization) {
    return NextResponse.json(
      { error: "組織は必須です" },
      { status: 400 }
    );
  }

  // 下書きの場合はAI要約なし
  const summary = isDraft ? null : await summarizeAnnouncement(content).catch(() => "");

  const announcement = await prisma.announcement.create({
    data: {
      title,
      content,
      summary: summary || null,
      category: category ?? "一般",
      organization: organization ?? "",
      important: important ?? false,
      isDraft: isDraft ?? false,
      authorId: user.id,
    },
    include: {
      author: { select: { name: true } },
    },
  });

  // 下書きの場合はSlack通知しない
  if (!isDraft) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendSlackNotification({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        authorName: announcement.author.name ?? "不明",
        url: `${baseUrl}/announcements/${announcement.id}`,
      });

      // Slack送信済みフラグを更新
      await prisma.announcement.update({
        where: { id: announcement.id },
        data: { slackSent: true },
      });
    } catch (e) {
      console.error("Slack通知エラー:", e);
      // Slack通知失敗してもお知らせ作成は成功扱い
    }
  }

  return NextResponse.json(announcement, { status: 201 });
}
