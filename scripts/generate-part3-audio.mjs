/**
 * Part 3 会話音声ファイルを事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-part3-audio.mjs           # 未生成のみ
 *   node scripts/generate-part3-audio.mjs --force   # 全件再生成
 *
 * 生成先:
 *   public/audio/part3/conv-{n}.mp3   (n = 1〜35)
 *
 * 内容: 会話テキスト全文
 *   - W: 行 → en-US-Neural2-F（女性声）
 *   - M: 行 → en-US-Neural2-D（男性声）
 *   - ターンごとに別APIコール → バッファ連結でMP3生成
 *   - ターン末尾に 900ms ポーズ
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

const FORCE = process.argv.includes("--force");
const TURN_DELAY_MS = 300;
const CONV_DELAY_MS = 500;

mkdirSync(new URL("../public/audio/part3/", import.meta.url), { recursive: true });

function extractPart3Conversations(src) {
  const results = [];
  const seen = new Set();

  const re = /id:\s*(\d+),\s*part:\s*3[\s\S]*?conversation:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = parseInt(m[1]);
    const convNum = Math.ceil((id - 3000) / 3);
    if (seen.has(convNum)) continue;
    seen.add(convNum);

    const convText = m[2]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\t/g, "\t");

    results.push({ convNum, convText });
  }

  return results.sort((a, b) => a.convNum - b.convNum);
}

function parseTurns(convText) {
  return convText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const isMan   = line.startsWith("M:");
      const isWoman = line.startsWith("W:");
      if (!isMan && !isWoman) return null;
      const text  = line.replace(/^[WM]:\s*/, "").trim();
      const voice = isMan ? "en-US-Neural2-D" : "en-US-Neural2-F";
      return { text, voice };
    })
    .filter(Boolean);
}

async function generateTurnAudio(text, voice) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const ssml = `<speak>${escaped}<break time="900ms"/></speak>`;

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: "en-US", name: voice },
        audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
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

async function generateConversationAudio(convText) {
  const turns = parseTurns(convText);
  const buffers = [];

  for (let i = 0; i < turns.length; i++) {
    const { text, voice } = turns[i];
    const buf = await generateTurnAudio(text, voice);
    buffers.push(buf);
    if (i < turns.length - 1) await sleep(TURN_DELAY_MS);
  }

  return Buffer.concat(buffers);
}

async function main() {
  const src = readFileSync(new URL("../data/questions.ts", import.meta.url), "utf-8");
  const conversations = extractPart3Conversations(src);
  console.log(`\nPart 3 会話 ${conversations.length} 件を処理します${FORCE ? "（--force: 全件再生成）" : ""}`);

  let generated = 0;
  let skipped   = 0;
  let failed    = 0;

  for (const { convNum, convText } of conversations) {
    const filePath = new URL(
      `../public/audio/part3/conv-${convNum}.mp3`,
      import.meta.url
    );

    if (!FORCE && existsSync(filePath)) {
      skipped++;
      continue;
    }

    const turns = parseTurns(convText);
    process.stdout.write(`\n  conv-${convNum} (${turns.length}ターン) 生成中...`);

    try {
      const buffer = await generateConversationAudio(convText);
      writeFileSync(filePath, buffer);
      generated++;
      process.stdout.write(` 完了 (${buffer.length} bytes)`);
      await sleep(CONV_DELAY_MS);
    } catch (e) {
      failed++;
      console.error(`\n  conv-${convNum} 失敗 — ${e.message}`);
    }
  }

  console.log(
    `\n\nPart 3 音声完了 — 生成: ${generated}, スキップ: ${skipped}, 失敗: ${failed}`
  );
}

main().catch(console.error);
