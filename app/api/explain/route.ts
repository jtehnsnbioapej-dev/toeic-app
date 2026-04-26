import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { question, options, answer, selected, part } = await req.json();

    const isCorrect = answer === selected;
    const prompt = `TOEIC Part${part}の問題の解説をしてください。

問題: ${question}
選択肢: ${options.map((o: string, i: number) => `${["A","B","C","D"][i]}. ${o}`).join(" / ")}
正解: ${answer}
ユーザーの回答: ${selected}

${isCorrect ? "正解でした。" : "不正解でした。"}

100字以内で、なぜその答えが正解なのかをわかりやすく日本語で説明してください。文法用語を使う場合は簡単な言葉で補足してください。`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ explanation: text });
  } catch (error) {
    return NextResponse.json({ explanation: null }, { status: 500 });
  }
}
