/**
 * Part 1 音声ファイルを事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-part1-audio.mjs
 *
 * 生成先:
 *   public/audio/part1/q-{id}.mp3
 *
 * 内容: "A. [選択肢A]. B. [選択肢B]. C. [選択肢C]. D. [選択肢D]."
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

mkdirSync(new URL("../public/audio/part1/", import.meta.url), { recursive: true });

// Part 1 問題を questions.ts から抽出
function extractPart1Questions(src) {
  const results = [];
  // part: 1 のブロックを探す
  const re = /\{\s*id:\s*(\d+),\s*part:\s*1[\s\S]*?options:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = parseInt(m[1]);
    const optionsRaw = m[2].match(/"((?:[^"\\]|\\.)*)"/g) || [];
    const options = optionsRaw.map((o) => o.slice(1, -1));
    results.push({ id, options });
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
  const questions = extractPart1Questions(src);
  console.log(`\n📷 Part 1 問題 ${questions.length} 件を処理します`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of questions) {
    const filePath = new URL(`../public/audio/part1/q-${q.id}.mp3`, import.meta.url);
    if (existsSync(filePath)) {
      skipped++;
      continue;
    }
    const labels = ["A", "B", "C", "D"];
    const parts = q.options.map((opt, i) => `${labels[i]}. ${opt.replace(/\.$/, "")}.`);
    const ssml = `<speak>${parts.join('<break time="700ms"/>')}</speak>`;
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
  console.log(`\n✅ Part 1 音声完了 — 生成: ${generated}, スキップ: ${skipped}, 失敗: ${failed}`);
}

main().catch(console.error);
