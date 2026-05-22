/**
 * Part 4 モノローグ音声ファイルを事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-part4-audio.mjs           # 未生成のみ
 *   node scripts/generate-part4-audio.mjs --force   # 全件再生成
 *
 * 生成先:
 *   public/audio/part4/talk-{n}.mp3
 *
 * 内容: monologue テキスト全文（単一音声 en-US-Neural2-F）
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
const TALK_DELAY_MS = 500;

mkdirSync(new URL("../public/audio/part4/", import.meta.url), { recursive: true });

function extractPart4Talks(src) {
  const results = [];
  const seen = new Set();

  const re = /id:\s*(\d+),\s*part:\s*4[\s\S]*?monologue:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = parseInt(m[1]);
    const talkNum = Math.ceil((id - 4000) / 3);
    if (seen.has(talkNum)) continue;
    seen.add(talkNum);

    const monologueText = m[2]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\t/g, "\t");

    results.push({ talkNum, monologueText });
  }

  return results.sort((a, b) => a.talkNum - b.talkNum);
}

async function synthesize(text) {
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
  const body = {
    input: { text },
    voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
    audioConfig: { audioEncoding: "MP3", speakingRate: 1.0 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS API error ${res.status}: ${err}`);
  }
  const json = await res.json();
  return Buffer.from(json.audioContent, "base64");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const srcFile = new URL("../data/questions-part4.ts", import.meta.url);
  const srcExtra = new URL("../data/questions-part4-extra.ts", import.meta.url);
  const src = readFileSync(srcFile, "utf-8") + "\n" + readFileSync(srcExtra, "utf-8");
  const talks = extractPart4Talks(src);

  console.log(`Part 4 talks found: ${talks.length}`);

  let generated = 0;
  let skipped = 0;

  for (const { talkNum, monologueText } of talks) {
    const outPath = new URL(`../public/audio/part4/talk-${talkNum}.mp3`, import.meta.url);

    if (!FORCE && existsSync(outPath)) {
      skipped++;
      continue;
    }

    console.log(`Generating talk-${talkNum}.mp3 ...`);

    try {
      const buf = await synthesize(monologueText);
      writeFileSync(outPath, buf);
      generated++;
      await sleep(TALK_DELAY_MS);
    } catch (e) {
      console.error(`  ERROR talk-${talkNum}: ${e.message}`);
    }
  }

  console.log(`\nDone. Generated: ${generated}, Skipped: ${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
