/**
 * 音声ファイルを事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-audio.mjs            # 全音声を生成（差分のみ）
 *   node scripts/generate-audio.mjs --vocab     # 単語のみ
 *   node scripts/generate-audio.mjs --questions # 問題のみ
 *
 * 生成先:
 *   public/audio/vocab/{id}.mp3
 *   public/audio/questions/q-{id}.mp3
 *
 * 前提: .env.local に GOOGLE_TTS_API_KEY が設定されていること
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";

const args = process.argv.slice(2);
const vocabOnly = args.includes("--vocab");
const questionsOnly = args.includes("--questions");

// .env.local から APIキーを読み込む
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

const DELAY_MS = 150; // レート制限対策（150ms間隔）

// ディレクトリ作成
mkdirSync(new URL("../public/audio/vocab/", import.meta.url), { recursive: true });
mkdirSync(new URL("../public/audio/questions/", import.meta.url), { recursive: true });

// TSファイルから単語を抽出
function extractVocab(src) {
  const results = [];
  const re = /\{\s*id:\s*(\d+)\s*,\s*word:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    results.push({ id: parseInt(m[1]), word: m[2] });
  }
  return results;
}

// TSファイルから問題を抽出
function extractQuestions(src) {
  const results = [];
  const re = /\{\s*id:\s*(\d+)[\s\S]*?question:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?options:\s*\[([\s\S]*?)\]\s*,\s*answer:\s*(\d+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = parseInt(m[1]);
    const question = m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n");
    const optionsRaw = m[3].match(/"((?:[^"\\]|\\.)*)"/g) || [];
    const options = optionsRaw.map((o) => o.slice(1, -1).replace(/\\"/g, '"'));
    const answer = parseInt(m[4]);
    results.push({ id, question, options, answer });
  }
  return results;
}

// Google TTS API で音声生成 → Buffer を返す
async function generateAudio(text) {
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-US", name: "en-US-Neural2-F" },
        audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 },
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

// 単語音声を生成
async function generateVocabAudio() {
  const src = readFileSync(new URL("../data/vocabulary.ts", import.meta.url), "utf-8");
  const words = extractVocab(src);
  console.log(`\n📚 単語 ${words.length} 件を処理します`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const word of words) {
    const filePath = new URL(`../public/audio/vocab/${word.id}.mp3`, import.meta.url);
    if (existsSync(filePath)) {
      skipped++;
      continue;
    }
    try {
      const buffer = await generateAudio(word.word);
      writeFileSync(filePath, buffer);
      generated++;
      process.stdout.write(`\r  生成: ${generated}  スキップ: ${skipped}  失敗: ${failed}   `);
      await sleep(DELAY_MS);
    } catch (e) {
      failed++;
      console.error(`\n  ❌ ID:${word.id} "${word.word}" — ${e.message}`);
    }
  }
  console.log(`\n✅ 単語完了 — 生成: ${generated}, スキップ: ${skipped}, 失敗: ${failed}`);
}

// 問題文音声を生成
async function generateQuestionsAudio() {
  const src1 = readFileSync(new URL("../data/questions.ts", import.meta.url), "utf-8");
  const src2 = readFileSync(new URL("../data/questions-extra.ts", import.meta.url), "utf-8");
  const all = [...extractQuestions(src1), ...extractQuestions(src2)];

  // IDの重複を除去（questions.ts 優先）
  const map = new Map();
  for (const q of all) {
    if (!map.has(q.id)) map.set(q.id, q);
  }
  const questions = [...map.values()];
  console.log(`\n📝 問題 ${questions.length} 件を処理します`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const q of questions) {
    const filePath = new URL(`../public/audio/questions/q-${q.id}.mp3`, import.meta.url);
    if (existsSync(filePath)) {
      skipped++;
      continue;
    }
    const text = q.question
      .replace(/_+/, q.options[q.answer] ?? "")
      .replace(/\\n/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    try {
      const buffer = await generateAudio(text);
      writeFileSync(filePath, buffer);
      generated++;
      process.stdout.write(`\r  生成: ${generated}  スキップ: ${skipped}  失敗: ${failed}   `);
      await sleep(DELAY_MS);
    } catch (e) {
      failed++;
      console.error(`\n  ❌ ID:${q.id} — ${e.message}`);
    }
  }
  console.log(`\n✅ 問題完了 — 生成: ${generated}, スキップ: ${skipped}, 失敗: ${failed}`);
}

// 実行
if (!questionsOnly) await generateVocabAudio();
if (!vocabOnly) await generateQuestionsAudio();
console.log("\n🎉 完了！");
