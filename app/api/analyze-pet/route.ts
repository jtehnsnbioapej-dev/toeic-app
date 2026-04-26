import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `この動物の写真を見て、キャラクター設定を日本語でJSONのみで返してください。
{
  "animalType": "犬/猫/うさぎ/ハムスター/鳥/その他 のどれか1つ",
  "personality": "性格の説明（例: 元気で人懐っこい甘えん坊）",
  "speakingStyle": "語尾や話し方の特徴（例: 語尾は「ワン！」でテンションが高め）",
  "nameIdeas": ["名前案1", "名前案2", "名前案3"],
  "catchphrase": "この子らしいひとこと（20字以内）"
}
JSON以外は絶対に出力しないこと。`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "{}";
    const profile = JSON.parse(text.trim());
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "analysis failed" }, { status: 500 });
  }
}
