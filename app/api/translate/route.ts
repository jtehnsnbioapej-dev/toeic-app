import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 128,
      messages: [
        {
          role: "user",
          content: `次の英文を自然な日本語に翻訳してください。訳文のみ出力し、説明は不要です。\n\n${text}`,
        },
      ],
    });

    const translation = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ translation });
  } catch {
    return NextResponse.json({ translation: null }, { status: 500 });
  }
}
