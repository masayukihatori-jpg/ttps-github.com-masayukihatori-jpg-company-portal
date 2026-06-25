import Anthropic from "@anthropic-ai/sdk";

/** HTMLタグを除去してプレーンテキストに変換 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * お知らせ本文をAIで要約する（1〜2文、50字以内）
 * ANTHROPIC_API_KEY が未設定の場合はテキスト先頭100字を返す
 */
export async function summarizeAnnouncement(htmlContent: string): Promise<string> {
  const plainText = htmlToPlainText(htmlContent);
  if (!plainText) return "";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // フォールバック：先頭100字
    return plainText.length > 100 ? plainText.slice(0, 100) + "…" : plainText;
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 150,
      messages: [
        {
          role: "user",
          content: `以下のお知らせ本文を、要点を1〜2文（60字以内）で日本語要約してください。要約文のみ返してください。\n\n${plainText}`,
        },
      ],
    });
    const text = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    return text || plainText.slice(0, 100) + "…";
  } catch {
    return plainText.length > 100 ? plainText.slice(0, 100) + "…" : plainText;
  }
}
