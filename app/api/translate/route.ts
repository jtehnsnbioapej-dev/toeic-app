import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`;
    const res = await fetch(url);
    const data = await res.json();

    const translation =
      data.responseStatus === 200 ? data.responseData.translatedText : null;

    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[translate] error:", err);
    return NextResponse.json({ translation: null }, { status: 500 });
  }
}
