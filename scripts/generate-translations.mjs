/**
 * 問題文の日本語訳を事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-translations.mjs           # 最初の50問を翻訳
 *   node scripts/generate-translations.mjs --limit 30  # 30問ずつ
 *   node scripts/generate-translations.mjs --all       # 全問（時間がかかる）
 *
 * MyMemory API は1日5,000文字まで無料。--limit 50 が目安。
 */

import { readFileSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { pathToFileURL } from "url";

const args = process.argv.slice(2);
const limitAll = args.includes("--all");
const limitIdx = args.indexOf("--limit");
const BATCH_SIZE = limitAll ? Infinity : (limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 50);
const DELAY_MS = 800;

// 既存の翻訳を読み込む
const translationsPath = new URL("../data/question-translations.json", import.meta.url);
const existing = JSON.parse(readFileSync(translationsPath, "utf-8"));

// questions.ts と questions-extra.ts から問題を動的 import
const questionsPath = new URL("../data/questions.ts", import.meta.url);
const extraPath = new URL("../data/questions-extra.ts", import.meta.url);

// TSファイルをそのまま読んで question フィールドだけ抽出（eval不要の簡易パース）
function extractQuestions(filePath) {
  const src = readFileSync(new URL(filePath, import.meta.url), "utf-8");
  const results = [];
  const re = /\{\s*id:\s*(\d+)[\s\S]*?question:\s*"((?:[^"\\]|\\.)*)"\s*,[\s\S]*?options:\s*\[([\s\S]*?)\]\s*,\s*answer:\s*(\d+)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const id = parseInt(m[1]);
    const question = m[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const optionsRaw = m[3].match(/"((?:[^"\\]|\\.)*)"/g) || [];
    const options = optionsRaw.map((o) => o.slice(1, -1).replace(/\\"/g, '"'));
    const answer = parseInt(m[4]);
    results.push({ id, question, options, answer });
  }
  return results;
}

const allQuestions = [
  ...extractQuestions("../data/questions.ts"),
];

// 未翻訳の問題を抽出
const untranslated = allQuestions.filter((q) => !existing[q.id]);
console.log(`未翻訳: ${untranslated.length}問 / 全${allQuestions.length}問`);

const batch = untranslated.slice(0, BATCH_SIZE);
console.log(`今回翻訳: ${batch.length}問\n`);

async function translate(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  const data = await res.json();
  // レスポンス形式: [[["翻訳文", "原文", ...], ...], ...]
  const translation = data[0].map((chunk) => chunk[0]).join("");
  if (!translation) throw new Error("Empty translation");
  return translation;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let count = 0;
for (const q of batch) {
  const filledQuestion = q.question.replace(/_+/, q.options[q.answer] || "");
  try {
    const translation = await translate(filledQuestion);
    existing[q.id] = translation;
    count++;
    console.log(`[${count}/${batch.length}] ID ${q.id}: ${translation}`);
  } catch (err) {
    console.error(`[ERROR] ID ${q.id}: ${err.message}`);
    break;
  }
  writeFileSync(translationsPath, JSON.stringify(existing, null, 2));
  if (count < batch.length) await sleep(DELAY_MS);
}

console.log(`\n完了: ${count}問 翻訳済み（累計: ${Object.keys(existing).length}問）`);
