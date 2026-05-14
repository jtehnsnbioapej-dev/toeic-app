/**
 * Part 2 音声ファイルを事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-part2-audio.mjs
 *
 * 生成先:
 *   public/audio/part2/q-{id}.mp3
 *
 * 内容: "[質問文] [A. 選択肢A] [B. 選択肢B] [C. 選択肢C]"
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
  console.error("❌ GOOGLE_TTS_API_KEY が .env.local にありません");
  process.exit(1);
}

const DELAY_MS = 200;

mkdirSync(new URL("../public/audio/part2/", import.meta.url), { recursive: true });

// Part 2 問題を questions.ts から抽出
function extractPart2Questions(src) {
  const results = [];
  // part: 2 のブロックを探す (id と question と options を抽出)
  const re = /\{\s*id:\s*(\d+),\s*part:\s*2[\s\S]*?question:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?options:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = parseInt(m[1]);
    const question = m[2].replace(/\\"/g, '"');
    const optionsRaw = m[3].match(/"((?:[^"\\]|\\.)*)"/g) || [];
    const options = optionsRaw.map((o) => o.slice(1, -1));
    results.push({ id, question, options });
  }
  return results;
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
  const questions = extractPart2Questions(src);
  console.log(`\n🎧 Part 2 問題 ${questions.length} 件を処理します`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of questions) {
    const filePath = new URL(`../public/audio/part2/q-${q.id}.mp3`, import.meta.url);
    if (existsSync(filePath)) {
      skipped++;
      continue;
    }
    const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const labels = ["A", "B", "C"];
    const parts = q.options.map((opt, i) => `${labels[i]}. ${escape(opt.replace(/\.$/, ""))}.`);
    const ssml = `<speak>${escape(q.question)}<break time="1000ms"/>${parts.join('<break time="700ms"/>')}</speak>`;
    try {
      const buffer = await generateAudio(ssml);
      writeFileSync(filePath, buffer);
      generated++;
      process.stdout.write(`\r  生成: ${generated}  スキップ: ${skipped}  失敗: ${failed}   `);
      await sleep(DELAY_MS);
    } catch (e) {
      failed++;
      console.error(`\n  ❌ ID:${q.id} — ${e.message}`);
    }
  }
  console.log(`\n✅ Part 2 音声完了 — 生成: ${generated}, スキップ: ${skipped}, 失敗: ${failed}`);
}

main().catch(console.error);
