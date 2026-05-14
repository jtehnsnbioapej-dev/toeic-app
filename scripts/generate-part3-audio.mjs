/**
 * Part 3 会話音声ファイルを事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-part3-audio.mjs
 *
 * 生成先:
 *   public/audio/part3/conv-{n}.mp3   (n = 1〜35)
 *
 * 内容: 会話テキスト全文
 *   - W: 行 → ノーマルピッチ（女性声）
 *   - M: 行 → ピッチ -4st（同じ音声を低く変換して男性っぽく）
 *   - ターン間に 900ms のポーズ
 *
 * 前提: .env.local に GOOGLE_TTS_API_KEY が設定されていること
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

function loadEnv() {
  try {
    const env = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
    for (const line of env.split("\n")) {
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
if (!API_KEY) {
  console.error("GOOGLE_TTS_API_KEY が .env.local にありません");
  process.exit(1);
}

const DELAY_MS = 250;

mkdirSync(new URL("../public/audio/part3/", import.meta.url), { recursive: true });

/**
 * questions.ts から Part 3 の会話テキストを抽出
 * 各会話は連続する3問が同じテキストを共有しているため
 * convNum = ceil((id - 3000) / 3) で番号を割り当てる
 */
function extractPart3Conversations(src) {
  const results = [];
  const seen = new Set();

  // conversation フィールドを含む Part 3 ブロックを抽出
  const re = /id:\s*(\d+),\s*part:\s*3[\s\S]*?conversation:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = parseInt(m[1]);
    const convNum = Math.ceil((id - 3000) / 3);
    if (seen.has(convNum)) continue;
    seen.add(convNum);

    // エスケープされた \n を実際の改行に戻す
    const convText = m[2]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\t/g, "\t");

    results.push({ convNum, convText });
  }

  return results.sort((a, b) => a.convNum - b.convNum);
}

/**
 * 会話テキストを SSML に変換
 * W: → ノーマルピッチ, M: → ピッチ低め (-4st)
 * ターン間に <break time="900ms"/>
 */
function buildSSML(convText) {
  const escape = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = convText.split("\n").map((l) => l.trim()).filter(Boolean);

  const parts = lines.map((line) => {
    const isWoman = line.startsWith("W:");
    const isMan   = line.startsWith("M:");
    const text    = line.replace(/^[WM]:\s*/, "").trim();
    if (!text) return null;

    const escaped = escape(text);
    if (isMan) {
      // 男性ターン: ピッチを下げてメリハリをつける
      return `<prosody pitch="-4st">${escaped}</prosody>`;
    } else {
      // 女性ターン (またはラベルなし): ノーマル
      return escaped;
    }
  }).filter(Boolean);

  return `<speak>${parts.join('<break time="900ms"/>')}</speak>`;
}

async function generateAudio(ssml) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
        audioConfig: { audioEncoding: "MP3", speakingRate: 0.85 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API ${res.status}: ${err}`);
  }
  const data = await res.json();
  return Buffer.from(data.audioContent, "base64");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const src = readFileSync(new URL("../data/questions.ts", import.meta.url), "utf-8");
  const conversations = extractPart3Conversations(src);
  console.log(`\nPart 3 会話 ${conversations.length} 件を処理します`);

  let generated = 0;
  let skipped   = 0;
  let failed    = 0;

  for (const { convNum, convText } of conversations) {
    const filePath = new URL(
      `../public/audio/part3/conv-${convNum}.mp3`,
      import.meta.url
    );

    if (existsSync(filePath)) {
      skipped++;
      continue;
    }

    const ssml = buildSSML(convText);

    try {
      const buffer = await generateAudio(ssml);
      writeFileSync(filePath, buffer);
      generated++;
      process.stdout.write(
        `\r  生成: ${generated}  スキップ: ${skipped}  失敗: ${failed}   `
      );
      await sleep(DELAY_MS);
    } catch (e) {
      failed++;
      console.error(`\n  conv-${convNum} 失敗 — ${e.message}`);
    }
  }

  console.log(
    `\nPart 3 音声完了 — 生成: ${generated}, スキップ: ${skipped}, 失敗: ${failed}`
  );
}

main().catch(console.error);
