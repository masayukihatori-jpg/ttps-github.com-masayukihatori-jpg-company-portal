import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSlackNotification } from "@/lib/slack";
import { summarizeAnnouncement } from "@/lib/summarize";

// お知らせ詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = false;

  const { id } = await params;
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      author: {
        select: { name: true, image: true, department: true, position: true },
      },
    },
  });

  if (!announcement) {
    return NextResponse.json(
      { error: "お知らせが見つかりません" },
      { status: 404 }
    );
  }

  // 一般ユーザーは下書きにアクセス不可
  if (announcement.isDraft && !isAdmin) {
    return NextResponse.json({ error: "このお知らせは公開されていません" }, { status: 403 });
  }

  return NextResponse.json(announcement);
}

// お知らせ更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;
  const body = await request.json();
  const { title, content, category, important, organization, isDraft } = body;

  // 現在のデータを取得
  const current = await prisma.announcement.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "お知らせが見つかりません" }, { status: 404 });
  }

  // 公開する場合（isDraft: false）でAI要約がない場合は生成
  let summary = current.summary;
  const publishing = isDraft === false && current.isDraft === true;

  if (publishing && !summary && content) {
    summary = await summarizeAnnouncement(content ?? current.content).catch(() => "") || null;
  }

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category }),
      ...(important !== undefined && { important }),
      ...(organization !== undefined && { organization }),
      ...(isDraft !== undefined && { isDraft }),
      ...(summary !== current.summary && { summary }),
    },
    include: { author: { select: { name: true } } },
  });

  // 下書きから公開に変わった場合、Slack通知（未送信の場合のみ）
  if (publishing && !current.slackSent) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendSlackNotification({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        authorName: announcement.author.name ?? "不明",
        url: `${baseUrl}/announcements/${announcement.id}`,
      });
      await prisma.announcement.update({
        where: { id },
        data: { slackSent: true },
      });
    } catch (e) {
      console.error("Slack通知エラー:", e);
    }
  }

  return NextResponse.json(announcement);
}

// お知らせ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
