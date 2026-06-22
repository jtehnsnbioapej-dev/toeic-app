export type ProgressEntry = {
  date: string; // YYYY-MM-DD
  correctCount: number;
  totalCount: number;
  parts: { [key: string]: { correct: number; total: number } };
  difficulties?: { [key: string]: { correct: number; total: number } };
};

export type WordProgress = {
  [wordId: number]: "known" | "unknown" | "unseen";
};

const PROGRESS_KEY = "toeic_progress";
const WORD_KEY = "toeic_word_progress";
const STREAK_KEY = "toeic_streak";
const LAST_STUDY_KEY = "toeic_last_study";

export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function getProgress(): ProgressEntry[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(PROGRESS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveTodayProgress(correct: number, total: number, part: number, difficulty?: number) {
  const today = getTodayStr();
  const all = getProgress();
  const existing = all.find((p) => p.date === today);
  const partKey = `part${part}`;
  const diffKey = difficulty !== undefined ? `d${difficulty}` : undefined;

  if (existing) {
    existing.correctCount += correct;
    existing.totalCount += total;
    if (!existing.parts[partKey]) existing.parts[partKey] = { correct: 0, total: 0 };
    existing.parts[partKey].correct += correct;
    existing.parts[partKey].total += total;
    if (diffKey) {
      if (!existing.difficulties) existing.difficulties = {};
      if (!existing.difficulties[diffKey]) existing.difficulties[diffKey] = { correct: 0, total: 0 };
      existing.difficulties[diffKey].correct += correct;
      existing.difficulties[diffKey].total += total;
    }
  } else {
    all.push({
      date: today,
      correctCount: correct,
      totalCount: total,
      parts: { [partKey]: { correct, total } },
      difficulties: diffKey ? { [diffKey]: { correct, total } } : {},
    });
  }

  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  updateStreak();
}

const SCORE_BANDS = [
  { key: "d1", from: 350, to: 500, maxCorrect: 100 },
  { key: "d2", from: 500, to: 600, maxCorrect: 100 },
  { key: "d3", from: 600, to: 700, maxCorrect: 100 },
  { key: "d4", from: 700, to: 800, maxCorrect: 100 },
  { key: "d5", from: 800, to: 990, maxCorrect: 100 },
];

export function getEstimatedScore(): number | null {
  const all = getProgress();
  const correctByDiff: { [key: string]: number } = {};

  for (const entry of all) {
    if (!entry.difficulties) continue;
    for (const [key, data] of Object.entries(entry.difficulties)) {
      if (!correctByDiff[key]) correctByDiff[key] = 0;
      correctByDiff[key] += data.correct;
    }
  }

  const totalCorrect = Object.values(correctByDiff).reduce((s, c) => s + c, 0);
  if (totalCorrect < 5) return null;

  // 難易度ごとに「その難易度だけで見た推定スコア」を計算し、正解数で加重平均する
  let weightedSum = 0;
  let totalWeight = 0;

  for (const band of SCORE_BANDS) {
    const correct = correctByDiff[band.key] ?? 0;
    if (correct === 0) continue;
    const progress = Math.min(correct / band.maxCorrect, 1.0);
    const diffScore = band.from + progress * (band.to - band.from);
    const weight = Math.min(correct, band.maxCorrect);
    weightedSum += diffScore * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) / 50) * 50;
}

export function getWordProgress(): WordProgress {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(WORD_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveWordProgress(wordId: number, status: "known" | "unknown") {
  const current = getWordProgress();
  current[wordId] = status;
  localStorage.setItem(WORD_KEY, JSON.stringify(current));
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(STREAK_KEY) || 0);
}

function updateStreak() {
  const today = getTodayStr();
  const last = localStorage.getItem(LAST_STUDY_KEY);

  if (!last) {
    localStorage.setItem(STREAK_KEY, "1");
    localStorage.setItem(LAST_STUDY_KEY, today);
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (last === today) return; // already updated today
  if (last === yesterdayStr) {
    // consecutive day
    const streak = getStreak() + 1;
    localStorage.setItem(STREAK_KEY, String(streak));
  } else {
    // streak broken
    localStorage.setItem(STREAK_KEY, "1");
  }
  localStorage.setItem(LAST_STUDY_KEY, today);
}

const WRONG_KEY_PREFIX = "toeic_wrong_p";

export function getWrongIds(part: number): number[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(WRONG_KEY_PREFIX + part);
  return raw ? JSON.parse(raw) : [];
}

export function addWrongId(part: number, id: number): void {
  const ids = new Set(getWrongIds(part));
  ids.add(id);
  localStorage.setItem(WRONG_KEY_PREFIX + part, JSON.stringify([...ids]));
}

export function removeWrongId(part: number, id: number): void {
  const ids = new Set(getWrongIds(part));
  ids.delete(id);
  localStorage.setItem(WRONG_KEY_PREFIX + part, JSON.stringify([...ids]));
}

export function getWeakParts(): { part: string; rate: number }[] {
  const all = getProgress();
  const totals: { [key: string]: { correct: number; total: number } } = {};

  for (const entry of all) {
    for (const [part, data] of Object.entries(entry.parts)) {
      if (!totals[part]) totals[part] = { correct: 0, total: 0 };
      totals[part].correct += data.correct;
      totals[part].total += data.total;
    }
  }

  return Object.entries(totals)
    .map(([part, data]) => ({
      part,
      rate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    }))
    .sort((a, b) => a.rate - b.rate);
}
