/**
 * Part 6/7 パッセージの日本語訳を事前生成するスクリプト
 *
 * 使い方:
 *   node scripts/generate-passage-translations.mjs           # 未生成のみ
 *   node scripts/generate-passage-translations.mjs --force   # 全件再生成
 *
 * 生成先: data/passage-translations.json
 * キー: passageId（例: "p6-d1-001", "p7-d1-001"）
 * 値: パッセージ本文の日本語訳
 *   - Part 6: 空欄を正解で埋めた文を翻訳
 *   - Part 7: パッセージ本文（ヘッダー除去後）を翻訳
 */

import { readFileSync, writeFileSync } from "fs";

const args = process.argv.slice(2);
const FORCE = args.includes("--force");
const DELAY_MS = 700;

// 既存の翻訳を読み込む
const outputPath = new URL("../data/passage-translations.json", import.meta.url);
let existing = {};
try {
  existing = JSON.parse(readFileSync(outputPath, "utf-8"));
} catch {
  existing = {};
}

// TSファイルからパッセージデータを抽出
function extractPassageData(filePath) {
  const src = readFileSync(new URL(filePath, import.meta.url), "utf-8");
  const passageMap = new Map(); // passageId → { passage, questions: [{options, answer}] }

  const re = /id:\s*\d+[\s\S]*?passageId:\s*"([^"]+)"[\s\S]*?passage:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?options:\s*\[([\s\S]*?)\][\s\S]*?answer:\s*(\d+)/g;

  let m;
  while ((m = re.exec(src)) !== null) {
    const passageId = m[1];
    const passage = m[2]
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    const optionsRaw = m[3].match(/"((?:[^"\\]|\\.)*)"/g) || [];
    const options = optionsRaw.map((o) => o.slice(1, -1).replace(/\\"/g, '"'));
    const answer = parseInt(m[4]);

    if (!passageMap.has(passageId)) {
      passageMap.set(passageId, { passage, questions: [] });
    }
    passageMap.get(passageId).questions.push({ options, answer });
  }

  return passageMap;
}

// ヘッダー行（To:/From:/Subject: など、最初の空行まで）を除去
function getBody(passage) {
  const idx = passage.indexOf("\n\n");
  return idx >= 0 ? passage.slice(idx + 2) : passage;
}

// Part 6: _____(N)_____ を正解で置換
function fillBlanks(body, questions) {
  let filled = body;
  questions.forEach((q, i) => {
    filled = filled.replace(`_____(${i + 1})_____`, q.options[q.answer]);
  });
  return filled;
}

// 翻訳（Google Translate 非公式API）
async function translate(text) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const translation = data[0].map((chunk) => chunk[0]).join("");
  if (!translation) throw new Error("Empty translation");
  return translation;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Part 6/7 データ読み込み
const part6Map = extractPassageData("../data/questions-part6-new.ts");
const part7Map = extractPassageData("../data/questions-part7-new.ts");

const allEntries = [
  ...Array.from(part6Map.entries()).map(([id, data]) => ({ id, ...data, isPart6: true })),
  ...Array.from(part7Map.entries()).map(([id, data]) => ({ id, ...data, isPart6: false })),
];

const toTranslate = FORCE
  ? allEntries
  : allEntries.filter((e) => !existing[e.id]);

console.log(`パッセージ総数: ${allEntries.length}`);
console.log(`翻訳済み: ${allEntries.length - toTranslate.length}`);
console.log(`今回翻訳: ${toTranslate.length}\n`);

if (toTranslate.length === 0) {
  console.log("すべて翻訳済みです。");
  process.exit(0);
}

let count = 0;
for (const entry of toTranslate) {
  const body = getBody(entry.passage);
  const text = entry.isPart6 ? fillBlanks(body, entry.questions) : body;

  try {
    const translation = await translate(text);
    existing[entry.id] = translation;
    count++;
    const preview = translation.length > 60 ? translation.slice(0, 60) + "…" : translation;
    console.log(`[${count}/${toTranslate.length}] ${entry.id}: ${preview}`);
    // 10件ごとに保存
    if (count % 10 === 0) {
      writeFileSync(outputPath, JSON.stringify(existing, null, 2), "utf-8");
    }
  } catch (err) {
    console.error(`[ERROR] ${entry.id}: ${err.message}`);
  }

  await sleep(DELAY_MS);
}

writeFileSync(outputPath, JSON.stringify(existing, null, 2), "utf-8");
console.log(`\n完了: ${count}件翻訳。data/passage-translations.json を更新しました。`);
