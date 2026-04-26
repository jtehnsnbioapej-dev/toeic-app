import { NextRequest, NextResponse } from "next/server";

const PROMPT =
  "この写真のペットを、高品質な3DCGキャラクターイラストに変換してください。リアルな毛並みと立体的な質感、セミリアルなレンダリング（アニメ調ではなく自然な3D風）。背景は鮮やかな緑色（グリーンスクリーン、R:0 G:255 B:0）の完全な単色のみにしてください。キャラクターの輪郭は明確な濃い線でくっきり描く。全身が見えるように描く。表情は正面向きで自然にリラックスした表情と姿勢にしてください。";

export async function POST(req: NextRequest) {

  const { imageBase64, mediaType, animalType } = await req.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const prompt = animalType ? PROMPT + `（動物の種類: ${animalType}）` : PROMPT;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mediaType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const data = await res.json();
  const part = data.candidates?.[0]?.content?.parts?.find(
    (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData
  );

  if (!part?.inlineData) {
    return NextResponse.json({ error: "No image in response" }, { status: 500 });
  }

  return NextResponse.json({
    imageBase64: part.inlineData.data,
    mimeType: part.inlineData.mimeType,
  });
}
