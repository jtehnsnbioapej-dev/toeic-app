import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { messages, petName, petType, characterProfile } = await req.json();

    const characterBlock = characterProfile
      ? `性格: ${characterProfile.personality}
話し方: ${characterProfile.speakingStyle}
キャッチフレーズ: ${characterProfile.catchphrase}`
      : `語尾に「ワン！」「にゃん！」など動物らしい言葉を時々混ぜる`;

    const systemPrompt = `あなたは「${petName}」という名前の${petType}です。
${characterBlock}
ユーザーと楽しく英会話の練習をしてください。
・英語で話しかけられたら英語で返し、日本語なら日本語で返す
・英語の間違いはやさしく自然に直してあげる
・短くテンポよく返答する（150字以内）`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: systemPrompt,
      messages: messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply: text });
  } catch {
    return NextResponse.json({ reply: null }, { status: 500 });
  }
}
