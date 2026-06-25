export async function sendSlackNotification({
  title,
  content,
  category,
  authorName,
  url,
}: {
  title: string;
  content: string;
  category: string;
  authorName: string;
  url: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL が設定されていません");
    return;
  }

  const categoryLabel: Record<string, string> = {
    GENERAL: "📢 一般",
    HR: "👥 人事・労務",
    IT: "💻 IT・システム",
    FACILITY: "🏢 設備・オフィス",
    EVENT: "🎉 イベント",
  };

  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📣 新しいお知らせが投稿されました",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*タイトル*\n${title}`,
          },
          {
            type: "mrkdwn",
            text: `*カテゴリ*\n${categoryLabel[category] ?? category}`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*内容*\n${content.length > 200 ? content.slice(0, 200) + "..." : content}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `投稿者: ${authorName}`,
          },
        ],
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "詳細を見る",
              emoji: true,
            },
            url,
            style: "primary",
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Slack通知の送信に失敗しました: ${response.statusText}`);
  }
}
