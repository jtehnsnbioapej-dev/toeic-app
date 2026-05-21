"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { questions, Question, DIFFICULTY_LABELS } from "@/data/questions";
import translationsMap from "@/data/question-translations.json";
import { saveTodayProgress } from "@/lib/storage";
import { stopCurrentAudio } from "@/lib/audioManager";
import { CORRECT_MESSAGES, WRONG_MESSAGES, QUESTION_MESSAGES, PART1_MESSAGES, PART2_MESSAGES, PART7_MESSAGES, EXCITED_MESSAGES } from "@/lib/petMessages";
import PetScene from "@/components/PetScene";
import SpeakButton from "@/components/SpeakButton";

const SESSION_SIZE: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number> = { 1: 5, 2: 10, 3: 9, 4: 9, 5: 10, 6: 10, 7: 5 };

const PART3_MESSAGES = [
  "会話を聞いてから答えてね！",
  "もう一度聞きたいときは再生ボタンで！",
  "落ち着いて聞けば大丈夫！",
  "会話の流れをイメージしながら聞こう！",
  "キーワードを拾いながら聞いてね！",
];

const PART3_RESULT: Record<0 | 1 | 2 | 3, string[]> = {
  3: [
    "3問全部正解！完璧だよ！",
    "パーフェクト！会話をバッチリ聞き取れてたね！",
    "全問正解！リスニング力すごい！",
    "3/3！もうネイティブの会話もいけそうだね！",
    "全部合ってた！この調子で次もいこう！",
  ],
  2: [
    "あと1問で全問正解だったね！惜しい！",
    "2問正解！もう少しで完璧だよ！",
    "いい感じ！あと1問取れると最高だった！",
    "2/3！次はパーフェクトを狙おう！",
    "惜しかった〜！でも会話の流れは掴めてるよ！",
  ],
  1: [
    "1問は正解！少しずつ耳が慣れてきてるよ！",
    "1問取れた！会話リスニングは練習あるのみ！",
    "まずは1問！ここから伸びていこう！",
    "1/3！音声をもう一度聞き直してみよう！",
    "焦らず、会話の流れをゆっくりつかんでいこう！",
  ],
  0: [
    "今回は難しかったね。音声をもう一度確認してみよう！",
    "会話を聞き直してからスクリプトを見てみよう！",
    "0問でも大丈夫！聞き直すことで必ず伸びるよ！",
    "難しかった！でも諦めないで、もう一回音声を聴こう！",
    "リスニングは積み重ね。一緒に練習しよう！",
  ],
};
const PART4_MESSAGES = [
  "スピーチを聞いてから答えてね！",
  "もう一度聞きたいときは再生ボタンで！",
  "アナウンスのキーワードを拾おう！",
  "落ち着いて聞けば大丈夫！",
  "ゆっくり丁寧に聞いてみよう！",
];

const PART4_RESULT: Record<0 | 1 | 2 | 3, string[]> = {
  3: [
    "3問全部正解！完璧だよ！",
    "パーフェクト！スピーチをバッチリ聞き取れてたね！",
    "全問正解！リスニング力すごい！",
    "3/3！この調子で次もいこう！",
    "全部合ってた！どんなアナウンスも聞き取れてるね！",
  ],
  2: [
    "あと1問で全問正解だったね！惜しい！",
    "2問正解！もう少しで完璧だよ！",
    "いい感じ！あと1問取れると最高だった！",
    "2/3！次はパーフェクトを狙おう！",
    "惜しかった〜！スピーチの流れは掴めてるよ！",
  ],
  1: [
    "1問は正解！少しずつ耳が慣れてきてるよ！",
    "1問取れた！アナウンスリスニングは練習あるのみ！",
    "まずは1問！ここから伸びていこう！",
    "1/3！音声をもう一度聞き直してみよう！",
    "焦らず、スピーチの要点をゆっくりつかんでいこう！",
  ],
  0: [
    "今回は難しかったね。音声をもう一度確認してみよう！",
    "スピーチを聞き直してから解説を見てみよう！",
    "0問でも大丈夫！聞き直すことで必ず伸びるよ！",
    "難しかった！でも諦めないで、もう一回音声を聴こう！",
    "リスニングは積み重ね。一緒に練習しよう！",
  ],
};

const LAST_SCORE_KEY = "partPracticeLastScore";

type LastScore = { correct: number; total: number };
type LastScoreMap = Record<string, LastScore>;

function sessionScoreKey(part: number, difficulty: number, sessionIdx: number) {
  return `${part}_${difficulty}_${sessionIdx}`;
}

function loadLastScores(): LastScoreMap {
  try { return JSON.parse(localStorage.getItem(LAST_SCORE_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveLastScore(part: number, difficulty: number, sessionIdx: number, correct: number, total: number) {
  const map = loadLastScores();
  map[sessionScoreKey(part, difficulty, sessionIdx)] = { correct, total };
  localStorage.setItem(LAST_SCORE_KEY, JSON.stringify(map));
}

function buildSessions(part: 1 | 2 | 3 | 4 | 5 | 6 | 7, difficulty: number): Question[][] {
  const filtered = questions
    .filter((q) => q.part === part && q.difficulty === difficulty && !isJapanese(q.question) && !q.options.some(isJapanese))
    .sort((a, b) => a.id - b.id);
  const size = SESSION_SIZE[part];
  const chunks: Question[][] = [];
  for (let i = 0; i < filtered.length; i += size) {
    chunks.push(filtered.slice(i, i + size));
  }
  return chunks;
}

function shuffleOptions(q: Question): Question {
  const correct = q.options[q.answer];
  const shuffled = [...q.options].sort(() => Math.random() - 0.5);
  return { ...q, options: shuffled, answer: shuffled.indexOf(correct) };
}

const isJapanese = (s: string) => /[\u3000-\u9FFF]/.test(s);

const PART_INFO: Record<number, { label: string; desc: string; icon: string }> = {
  1: { label: "Part 1", desc: "写真描写問題", icon: "📷" },
  2: { label: "Part 2", desc: "応答問題",     icon: "🎧" },
  3: { label: "Part 3", desc: "会話問題",     icon: "🗣️" },
  4: { label: "Part 4", desc: "説明問題",     icon: "📢" },
  5: { label: "Part 5", desc: "短文穴埋め",   icon: "✏️" },
  6: { label: "Part 6", desc: "長文穴埋め",   icon: "📄" },
  7: { label: "Part 7", desc: "読解問題",     icon: "📖" },
};


export default function PartPracticePage() {
  const [selectedPart, setSelectedPart] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | null>(null);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [sessions, setSessions] = useState<Question[][]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [finished, setFinished] = useState(false);
  const [petMessage, setPetMessage] = useState("どのパートを練習する？");
  const [speaker, setSpeaker] = useState<"left" | "right">("right");
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [userEmotion, setUserEmotion] = useState<"idle" | "happy" | "sad" | "think" | "excited">("idle");
  const [petEffect, setPetEffect] = useState<"correct" | "wrong" | null>(null);
  const [translation, setTranslation] = useState<string>("");
  const [lastScores, setLastScores] = useState<LastScoreMap>({});
  const [part3Selections, setPart3Selections] = useState<(number | null)[]>([]);
  const [part3Submitted, setPart3Submitted] = useState<boolean[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("globalDifficulty");
    if (saved) setDifficulty(Number(saved));
    setLastScores(loadLastScores());
  }, []);

  const selectPart = (part: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    setSelectedPart(part);
    setSessions(buildSessions(part, difficulty));
    setSelectedSession(null);
    setPetMessage("セッションを選んでね！");
  };

  const startSession = (sessionIdx: number) => {
    // Part 1/2/3/4 は選択肢シャッフルなし（音声順序または会話順序を維持）
    const qs = sessions[sessionIdx].map(q => (selectedPart === 1 || selectedPart === 2 || selectedPart === 3 || selectedPart === 4) ? q : shuffleOptions(q));
    setSelectedSession(sessionIdx);
    setQuizQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setResults([]);
    setExplanation("");
    setFinished(false);
    setUserChoice(null);
    setPetEffect(null);
    setUserEmotion("think");
    if (selectedPart === 3 || selectedPart === 4) {
      setPart3Selections(new Array(qs.length).fill(null));
      setPart3Submitted(new Array(Math.ceil(qs.length / 3)).fill(false));
    }
    setPetMessage(
      selectedPart === 1 ? PART1_MESSAGES[0] :
      selectedPart === 2 ? PART2_MESSAGES[0] :
      selectedPart === 3 ? PART3_MESSAGES[0] :
      selectedPart === 4 ? PART4_MESSAGES[0] :
      selectedPart === 7 ? PART7_MESSAGES[0] :
      QUESTION_MESSAGES[0]
    );
    window.scrollTo(0, 0);
  };

  const q = quizQuestions[current];

  const handleSelect = (idx: number) => {
    if (!q) return;

    if (selectedPart === 3 || selectedPart === 4) {
      const convIdx = Math.floor(current / 3);
      if (part3Submitted[convIdx]) return;
      const newSels = [...part3Selections];
      newSels[current] = idx;
      setPart3Selections(newSels);
      setUserChoice(`${["A", "B", "C", "D"][idx]}！`);
      setSpeaker("left");
      return;
    }

    if (selected !== null) return;
    stopCurrentAudio();
    setSelected(idx);
    const correct = idx === q.answer;
    const newResults = [...results, correct];
    setResults(newResults);
    saveTodayProgress(correct ? 1 : 0, 1, q.part);

    // 3問連続正解チェック（今回含む直近3問）
    const streak3 = correct && newResults.length >= 3 && newResults.slice(-3).every(Boolean);

    const reaction = streak3
      ? EXCITED_MESSAGES[Math.floor(Math.random() * EXCITED_MESSAGES.length)]
      : correct
        ? CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)]
        : WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];

    setUserChoice(`${["A", "B", "C", "D"][idx]}！`);
    setSpeaker("right");
    setPetMessage(reaction);
    setExplanation(q.explanation);
    setTranslation("");

    const cachedJa = (translationsMap as Record<string, string>)[String(q.id)];
    if (cachedJa) {
      setTranslation(cachedJa);
    } else {
      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: q.question.replace(/_+/, q.options[q.answer]) }),
      })
        .then((r) => r.json())
        .then((d) => { if (d.translation) setTranslation(d.translation); })
        .catch(() => {});
    }

    setPetEffect(correct ? "correct" : "wrong");
    setTimeout(() => { setUserEmotion(streak3 ? "excited" : correct ? "happy" : "sad"); }, 100);
  };

  const handlePart3Submit = () => {
    stopCurrentAudio();
    const convIdx = Math.floor(current / 3);
    const convStart = convIdx * 3;
    const newResults = [...results];
    let correctCount = 0;
    for (let i = 0; i < 3; i++) {
      const qIdx = convStart + i;
      if (qIdx < quizQuestions.length) {
        const sel = part3Selections[qIdx] ?? -1;
        const correct = sel === quizQuestions[qIdx].answer;
        newResults.push(correct);
        if (correct) correctCount++;
        saveTodayProgress(correct ? 1 : 0, 1, selectedPart!);
      }
    }
    setResults(newResults);
    const newSubmitted = [...part3Submitted];
    newSubmitted[convIdx] = true;
    setPart3Submitted(newSubmitted);
    const msgs = (selectedPart === 4 ? PART4_RESULT : PART3_RESULT)[correctCount as 0 | 1 | 2 | 3];
    setPetMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    setSpeaker("right");
    setTimeout(() => setUserEmotion(correctCount === 3 ? "excited" : correctCount >= 2 ? "happy" : "sad"), 100);
    setPetEffect(correctCount >= 2 ? "correct" : "wrong");
  };

  const handleNextConv = () => {
    const nextStart = (Math.floor(current / 3) + 1) * 3;
    if (nextStart >= quizQuestions.length) {
      const finalCorrect = results.filter(Boolean).length;
      saveLastScore(selectedPart!, difficulty, selectedSession!, finalCorrect, results.length);
      setLastScores(loadLastScores());
      setFinished(true);
    } else {
      setCurrent(nextStart);
      setSelected(null);
      setExplanation("");
      setTranslation("");
      setSpeaker("right");
      setUserChoice(null);
      setUserEmotion("think");
      setPetEffect(null);
      setPetMessage((selectedPart === 4 ? PART4_MESSAGES : PART3_MESSAGES)[Math.floor(Math.random() * PART3_MESSAGES.length)]);
      window.scrollTo(0, 0);
    }
  };

  const handleNext = () => {
    setPetEffect(null);
    if (current + 1 >= quizQuestions.length) {
      const finalCorrect = results.filter(Boolean).length;
      saveLastScore(selectedPart!, difficulty, selectedSession!, finalCorrect, results.length);
      setLastScores(loadLastScores());
      setFinished(true);
    } else {
      setCurrent(current + 1);
      setSelected(null);
      setExplanation("");
      setTranslation("");
      setSpeaker("right");
      setUserChoice(null);
      setUserEmotion("think");
      setPetMessage(
        selectedPart === 1 ? PART1_MESSAGES[Math.floor(Math.random() * PART1_MESSAGES.length)] :
        selectedPart === 2 ? PART2_MESSAGES[Math.floor(Math.random() * PART2_MESSAGES.length)] :
        selectedPart === 3 ? PART3_MESSAGES[Math.floor(Math.random() * PART3_MESSAGES.length)] :
        selectedPart === 4 ? PART4_MESSAGES[Math.floor(Math.random() * PART4_MESSAGES.length)] :
        selectedPart === 7 ? PART7_MESSAGES[Math.floor(Math.random() * PART7_MESSAGES.length)] :
        QUESTION_MESSAGES[Math.floor(Math.random() * QUESTION_MESSAGES.length)]
      );
      window.scrollTo(0, 0);
    }
  };

  // ── パート選択画面 ──────────────────────────────
  if (selectedPart === null) {
    return (
      <div className="page-wrap min-h-screen" style={{ background: "var(--bg)" }}>
        <div style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "16px 20px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Link href="/" style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none" }}>← ホーム</Link>
            <div style={{
              background: "rgba(56,178,240,0.15)", borderRadius: 20, padding: "4px 12px",
              fontSize: 12, fontWeight: 700, color: "var(--primary)",
            }}>
              目標 {DIFFICULTY_LABELS[difficulty]}
            </div>
          </div>
        </div>

        <PetScene message="どのパートを練習する？" leftEmotion="idle" bg="/図書館.png" />

        <div style={{ padding: "20px 20px 100px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 12 }}>パートを選んでください</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([1, 2, 3, 4, 5, 6, 7] as const).map((part) => {
              const info = PART_INFO[part];
              const totalQ = questions.filter(
                (q) => q.part === part && q.difficulty === difficulty && !isJapanese(q.question) && !q.options.some(isJapanese)
              ).length;
              return (
                <button
                  key={part}
                  onClick={() => selectPart(part)}
                  style={{
                    background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 18,
                    padding: "18px 20px", display: "flex", alignItems: "center", gap: 16,
                    textAlign: "left", cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(56,178,240,0.08)",
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: "linear-gradient(135deg, #EBF8FF, #C9EEFF)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 24, flexShrink: 0,
                  }}>
                    {info.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{info.label}</p>
                    <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 2, fontWeight: 600 }}>
                      {info.desc} · 全{totalQ}問
                    </p>
                  </div>
                  <span style={{ color: "#D1D5DB", fontSize: 18 }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── セッション選択画面 ──────────────────────────────
  if (selectedPart !== null && selectedSession === null && !finished) {
    const info = PART_INFO[selectedPart];
    return (
      <div className="page-wrap min-h-screen" style={{ background: "var(--bg)" }}>
        <div style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "16px 20px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button
              onClick={() => { setSelectedPart(null); setPetMessage("どのパートを練習する？"); }}
              style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ← パート選択
            </button>
            <div style={{
              background: "rgba(56,178,240,0.15)", borderRadius: 20, padding: "4px 12px",
              fontSize: 12, fontWeight: 700, color: "var(--primary)",
            }}>
              {info.label} · {DIFFICULTY_LABELS[difficulty]}
            </div>
          </div>
        </div>

        <PetScene message="セッションを選んでね！" leftEmotion="idle" bg="/図書館.png" />

        <div style={{ padding: "20px 20px 100px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 12 }}>
            {info.label} — セッション一覧（{SESSION_SIZE[selectedPart]}問/セッション{selectedPart === 3 ? " · 3問×1会話" : selectedPart === 4 ? " · 3問×1スピーチ" : ""}）
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sessions.map((sessionQs, idx) => {
              const ls = lastScores[sessionScoreKey(selectedPart, difficulty, idx)];
              const rate = ls ? Math.round((ls.correct / ls.total) * 100) : null;
              const rateColor = rate === null ? "#9CA3AF" : rate >= 80 ? "#059669" : rate >= 60 ? "#D97706" : "#DC2626";
              return (
                <button
                  key={idx}
                  onClick={() => startSession(idx)}
                  style={{
                    background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 16,
                    padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
                    textAlign: "left", cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(56,178,240,0.07)",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: ls ? "linear-gradient(135deg, #EBF8FF, #C9EEFF)" : "#F9FAFB",
                    border: ls ? "none" : "1.5px solid #E5E7EB",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: ls ? "var(--primary)" : "#9CA3AF",
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
                      Session {idx + 1}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {ls ? (
                      <>
                        <p style={{ fontSize: 13, fontWeight: 700, color: rateColor }}>
                          {ls.correct}/{ls.total}問
                        </p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: rateColor }}>
                          {rate}%
                        </p>
                      </>
                    ) : (
                      <p style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600 }}>未挑戦</p>
                    )}
                    <span style={{ color: "#D1D5DB", fontSize: 16 }}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── 結果画面 ──────────────────────────────────────────
  if (finished) {
    const correct = results.filter(Boolean).length;
    const rate = Math.round((correct / results.length) * 100);
    const finishMsg =
      rate === 100 ? "パーフェクト！すごすぎる！🎉" :
      rate >= 80  ? "すごい！よく頑張ったね！" :
      rate >= 60  ? "いい調子！毎日続ければ伸びるよ！" :
      "次は絶対できる！一緒に練習しよう！";

    return (
      <div className="page-wrap min-h-screen" style={{ background: "var(--bg)" }}>
        <div style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "16px 20px 12px",
        }}>
          <button
            onClick={() => { setSelectedSession(null); setFinished(false); setPetMessage("セッションを選んでね！"); }}
            style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            ← セッション一覧
          </button>
        </div>

        <PetScene message={finishMsg} leftEmotion={rate >= 80 ? "excited" : "idle"} bg={selectedPart === 1 ? "/自室.png" : selectedPart === 2 ? "/自室.png" : selectedPart === 3 ? "/自室.png" : selectedPart === 4 ? "/自室.png" : selectedPart === 5 ? "/オフィス.png" : selectedPart === 6 ? "/自習室.png" : "/試験会場.png"} />

        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "#fff", borderRadius: 24, padding: "28px 20px",
            textAlign: "center", boxShadow: "0 4px 20px rgba(56,178,240,0.12)",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700 }}>
              {PART_INFO[selectedPart!].label} · Session {selectedSession! + 1} · {DIFFICULTY_LABELS[difficulty]}
            </p>
            <p style={{ fontSize: 64, fontWeight: 700, color: "var(--text)", lineHeight: 1.1, marginTop: 8 }}>
              {correct}
              <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-sub)" }}>/{results.length}</span>
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: rate >= 80 ? "#059669" : rate >= 60 ? "#D97706" : "#DC2626", marginTop: 4 }}>
              正答率 {rate}%
            </p>
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 16 }}>
              {results.map((r, i) => (
                <div key={i} style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: r ? "#22C55E" : "#F87171",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12,
                }}>
                  {r ? "○" : "×"}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => startSession(selectedSession!)}
            style={{
              background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
              color: "#fff", borderRadius: 18, padding: "16px 0",
              fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(56,178,240,0.35)",
            }}
          >
            Session {selectedSession! + 1} をもう一度
          </button>
          <button
            onClick={() => { setSelectedSession(null); setFinished(false); setPetMessage("セッションを選んでね！"); }}
            style={{
              background: "#fff", border: "2px solid #E5E7EB",
              borderRadius: 18, padding: "14px 0",
              fontWeight: 700, fontSize: 15, color: "var(--text)", cursor: "pointer",
            }}
          >
            セッション一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  // ── 問題画面 ──────────────────────────────────────────
  if (!q) return null;
  const progress = (current / quizQuestions.length) * 100;

  // Part 3/4 計算変数
  const p3ConvIdx = (selectedPart === 3 || selectedPart === 4) ? Math.floor(current / 3) : 0;
  const p3ConvStart = p3ConvIdx * 3;
  const p3WithinConv = current - p3ConvStart;
  const p3IsSubmitted = (selectedPart === 3 || selectedPart === 4) && (part3Submitted[p3ConvIdx] ?? false);
  const p3CurrentSel = (selectedPart === 3 || selectedPart === 4) ? (part3Selections[current] ?? null) : null;
  const p3AllSelected = (selectedPart === 3 || selectedPart === 4) && quizQuestions.length > 0 &&
    [0, 1, 2].every(i => {
      const idx = p3ConvStart + i;
      return idx >= quizQuestions.length || part3Selections[idx] !== null;
    });
  const p3NavPrev = () => {
    const prev = current - 1;
    setCurrent(prev);
    setUserChoice(part3Selections[prev] !== null ? `${["A","B","C","D"][part3Selections[prev]!]}！` : null);
    setUserEmotion("think");
    setPetEffect(null);
  };
  const p3NavNext = () => {
    const next = current + 1;
    setCurrent(next);
    setUserChoice(part3Selections[next] !== null ? `${["A","B","C","D"][part3Selections[next]!]}！` : null);
    setUserEmotion("think");
    setPetEffect(null);
  };

  return (
    <div className="page-wrap min-h-screen" style={{ background: "var(--bg)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "16px 20px 12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <button
              onClick={() => { setSelectedPart(null); setPetMessage("どのパートを練習する？"); }}
              style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              ← パート選択
            </button>
            <div style={{
              background: "rgba(56,178,240,0.15)", borderRadius: 20, padding: "4px 12px",
              fontSize: 12, fontWeight: 700, color: "var(--primary)",
            }}>
              {PART_INFO[selectedPart].label}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700 }}>
              {selectedPart === 3
                ? `会話 ${p3ConvIdx + 1} · Q${p3WithinConv + 1}/3`
                : selectedPart === 4
                ? `スピーチ ${p3ConvIdx + 1} · Q${p3WithinConv + 1}/3`
                : `${current + 1} / ${quizQuestions.length}`}
            </span>
          </div>

          <div style={{ height: 6, background: "rgba(56,178,240,0.2)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "var(--primary)", borderRadius: 99,
              width: `${progress}%`, transition: "width 0.3s ease",
            }} />
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <PetScene
            message={petMessage}
            leftMessage={userChoice ?? undefined}
            speaker={speaker}
            leftEmotion={userEmotion}
            petEffect={petEffect}
            bg={selectedPart === 1 ? "/自室.png" : selectedPart === 2 ? "/自室.png" : selectedPart === 3 ? "/自室.png" : selectedPart === 4 ? "/自室.png" : selectedPart === 5 ? "/オフィス.png" : selectedPart === 6 ? "/自習室.png" : "/試験会場.png"}
            speakText={(selectedPart === 1 || selectedPart === 2) ? q.question || `A. ${q.options[0]}` : undefined}
            speakAudioPath={(selectedPart === 1 || selectedPart === 2) ? `/audio/part${selectedPart}/q-${q.id}.mp3` : undefined}
          />

          {/* 選択肢オーバーレイ - Part 1/2のみ: A/B/C レターボタン */}
          {(selectedPart === 1 || selectedPart === 2) && (
          <div style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: "36%",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 6,
          }}>
            {q.options.map((_, idx) => {
              let bg = "rgba(255,255,255,0.88)";
              let border = "1px solid rgba(229,231,235,0.7)";
              let color = "var(--text)";
              if (selected !== null) {
                if (idx === q.answer) { bg = "rgba(240,253,244,0.95)"; border = "1px solid #22C55E"; color = "#166534"; }
                else if (idx === selected) { bg = "rgba(255,241,242,0.95)"; border = "1px solid #F87171"; color = "#9F1239"; }
                else { color = "#9CA3AF"; bg = "rgba(255,255,255,0.65)"; }
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null}
                  style={{
                    background: bg, border, borderRadius: 12,
                    padding: "8px 10px", cursor: selected !== null ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backdropFilter: "blur(6px)",
                    pointerEvents: "auto",
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: selected !== null
                      ? (idx === q.answer ? "#22C55E" : idx === selected ? "#F87171" : "#F3F4F6")
                      : "#EFF6FF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    color: selected !== null
                      ? (idx === q.answer || idx === selected ? "#fff" : "#9CA3AF")
                      : "var(--primary)",
                  }}>
                    {["A", "B", "C", "D"][idx]}
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {/* 選択肢オーバーレイ - Part 3/4/5/6/7: テキスト付き */}
          {selectedPart !== 1 && selectedPart !== 2 && (
          <div style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            width: "36%",
            maxHeight: 238,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 6,
            pointerEvents: "none",
            overflowY: "auto",
          }}>
            {q.options.map((opt, idx) => {
              let bg = "rgba(255,255,255,0.88)";
              let border = "1px solid rgba(229,231,235,0.7)";
              let color = "var(--text)";
              if (selectedPart === 3 || selectedPart === 4) {
                if (p3IsSubmitted) {
                  if (idx === q.answer) { bg = "rgba(240,253,244,0.95)"; border = "1px solid #22C55E"; color = "#166534"; }
                  else if (idx === p3CurrentSel) { bg = "rgba(255,241,242,0.95)"; border = "1px solid #F87171"; color = "#9F1239"; }
                  else { color = "#9CA3AF"; bg = "rgba(255,255,255,0.65)"; }
                } else if (idx === p3CurrentSel) {
                  bg = "rgba(219,234,254,0.95)"; border = "1px solid #60A5FA"; color = "#1E40AF";
                }
              } else if (selected !== null) {
                if (idx === q.answer) { bg = "rgba(240,253,244,0.95)"; border = "1px solid #22C55E"; color = "#166534"; }
                else if (idx === selected) { bg = "rgba(255,241,242,0.95)"; border = "1px solid #F87171"; color = "#9F1239"; }
                else { color = "#9CA3AF"; bg = "rgba(255,255,255,0.65)"; }
              }
              const isLocked = (selectedPart === 3 || selectedPart === 4) ? p3IsSubmitted : selected !== null;
              const isP3Sel = (selectedPart === 3 || selectedPart === 4) && idx === p3CurrentSel;
              const badgeBg = isLocked
                ? (idx === q.answer ? "#22C55E" : ((selectedPart === 3 || selectedPart === 4) ? idx === p3CurrentSel : idx === selected) ? "#F87171" : "#F3F4F6")
                : (isP3Sel ? "#60A5FA" : "#EFF6FF");
              const badgeColor = isLocked
                ? ((idx === q.answer || (selectedPart === 3 ? idx === p3CurrentSel : idx === selected)) ? "#fff" : "#9CA3AF")
                : (isP3Sel ? "#fff" : "var(--primary)");
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  style={{
                    background: bg, border, borderRadius: 12,
                    padding: "8px 10px", cursor: isLocked ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    textAlign: "left", width: "100%",
                    backdropFilter: "blur(6px)",
                    pointerEvents: "auto",
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                    background: badgeBg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    color: badgeColor,
                  }}>
                    {["A", "B", "C", "D"][idx]}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color, lineHeight: 1.3 }}>{opt}</span>
                </button>
              );
            })}
          </div>
          )}

          {/* Part 3/4: 前/次ナビ + 解答/次の会話ボタン */}
          {(selectedPart === 3 || selectedPart === 4) && (
            <div style={{
              position: "absolute", bottom: 12, left: 12, right: 12,
              display: "flex", gap: 8, zIndex: 7, alignItems: "center",
            }}>
              {p3WithinConv > 0 && (
                <button onClick={p3NavPrev} style={{
                  background: "rgba(255,255,255,0.9)", border: "1.5px solid #E5E7EB",
                  color: "var(--text)", borderRadius: 20, padding: "8px 14px",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>← 前の問題</button>
              )}
              <div style={{ flex: 1 }} />
              {p3WithinConv < 2 && p3ConvStart + p3WithinConv + 1 < quizQuestions.length && (
                <button onClick={p3NavNext} style={{
                  background: "rgba(255,255,255,0.9)", border: "1.5px solid #E5E7EB",
                  color: "var(--text)", borderRadius: 20, padding: "8px 14px",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}>次の問題 →</button>
              )}
              {!p3IsSubmitted && p3AllSelected && (
                <button onClick={handlePart3Submit} style={{
                  background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
                  color: "#fff", borderRadius: 20, padding: "8px 16px",
                  fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(56,178,240,0.45)",
                }}>解答</button>
              )}
              {p3IsSubmitted && (
                <button onClick={handleNextConv} style={{
                  background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
                  color: "#fff", borderRadius: 20, padding: "8px 16px",
                  fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(56,178,240,0.45)",
                }}>{p3ConvStart + 3 >= quizQuestions.length ? "結果を見る →" : selectedPart === 4 ? "次のスピーチ →" : "次の会話 →"}</button>
              )}
            </div>
          )}

          {/* Part 5/6/7: 次の問題ボタン */}
          {selected !== null && selectedPart !== 3 && selectedPart !== 4 && (
            <button
              onClick={handleNext}
              style={{
                position: "absolute", bottom: 12, right: 12,
                background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
                color: "#fff", borderRadius: 20, padding: "8px 16px",
                fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                boxShadow: "0 3px 10px rgba(56,178,240,0.45)",
                zIndex: 7,
              }}
            >
              {current + 1 >= quizQuestions.length ? "結果を見る →" : "次の問題 →"}
            </button>
          )}
        </div>
      </div>

      {/* Part 3: 会話音声カード */}
      {selectedPart === 3 && (() => {
        const convNum = Math.ceil((q.id - 3000) / 3);
        const withinConv = ((q.id - 3001) % 3) + 1;
        return (
          <div style={{ padding: "14px 20px 6px" }}>
            <div style={{
              background: "#fff", borderRadius: 18, padding: "14px 18px",
              boxShadow: "0 2px 12px rgba(56,178,240,0.12)",
              border: "1.5px solid #C9EEFF",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <SpeakButton
                  text=""
                  audioPath={`/audio/part3/conv-${convNum}.mp3`}
                  size={28}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", margin: 0 }}>
                  会話を聞く
                </p>
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "3px 0 0", fontWeight: 600 }}>
                  この会話の問題 {withinConv} / 3
                </p>
              </div>
              <div style={{
                background: "rgba(56,178,240,0.1)", borderRadius: 10, padding: "4px 10px",
                fontSize: 11, fontWeight: 700, color: "var(--primary)",
              }}>
                会話 {convNum}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Part 4: スピーチ音声カード */}
      {selectedPart === 4 && (() => {
        const talkNum = Math.ceil((q.id - 4000) / 3);
        const withinConv = ((q.id - 4001) % 3) + 1;
        return (
          <div style={{ padding: "14px 20px 6px" }}>
            <div style={{
              background: "#fff", borderRadius: 18, padding: "14px 18px",
              boxShadow: "0 2px 12px rgba(56,178,240,0.12)",
              border: "1.5px solid #C9EEFF",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <SpeakButton
                  text=""
                  audioPath={`/audio/part4/talk-${talkNum}.mp3`}
                  size={28}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", margin: 0 }}>
                  スピーチを聞く
                </p>
                <p style={{ fontSize: 12, color: "#94A3B8", margin: "3px 0 0", fontWeight: 600 }}>
                  このスピーチの問題 {withinConv} / 3
                </p>
              </div>
              <div style={{
                background: "rgba(56,178,240,0.1)", borderRadius: 10, padding: "4px 10px",
                fontSize: 11, fontWeight: 700, color: "var(--primary)",
              }}>
                スピーチ {talkNum}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Part 1: 写真 */}
      {selectedPart === 1 && q.imagePath && (
        <div style={{ padding: "16px 20px 8px" }}>
          <img
            src={q.imagePath}
            alt="写真"
            style={{ width: "100%", borderRadius: 20, maxHeight: 300, objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      {/* Part 2: 回答後 — 質問文表示 */}
      {selectedPart === 2 && selected !== null && (
        <div style={{ padding: "12px 20px 4px" }}>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: "10px 14px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 4 }}>質問</p>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.65, margin: 0 }}>{q.question}</p>
          </div>
        </div>
      )}

      {/* Part 1/2: 回答後 — 選択肢テキスト + 日本語訳 */}
      {(selectedPart === 1 || selectedPart === 2) && selected !== null && (
        <div style={{ padding: "8px 20px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.answer;
            const isWrong = idx === selected && !isCorrect;
            const textColor = isCorrect ? "#166534" : isWrong ? "#9F1239" : "#6B7280";
            const bg = isCorrect ? "#F0FDF4" : isWrong ? "#FFF1F2" : "transparent";
            return (
              <div key={idx} style={{ background: bg, borderRadius: 10, padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: textColor, minWidth: 20, flexShrink: 0 }}>
                    {["A", "B", "C", "D"][idx]}.
                  </span>
                  <div>
                    <p style={{ fontSize: 13, color: textColor, fontWeight: isCorrect || isWrong ? 700 : 600, lineHeight: 1.5, margin: 0 }}>{opt}</p>
                    {q.translations?.[idx] && (
                      <p style={{ fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 1.4, margin: "2px 0 0" }}>{q.translations[idx]}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Part 3/5/6/7: 問題文 */}
      {selectedPart !== 1 && selectedPart !== 2 && (
      <div style={{ padding: "0 20px 14px", background: "var(--bg)" }}>
        <div style={{
          background: "#fff", borderRadius: 20, padding: "20px",
          boxShadow: "0 2px 12px rgba(56,178,240,0.08)",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text)", whiteSpace: "pre-line", flex: 1 }}>
              {selected !== null
                ? q.question.replace(/_+/, q.options[q.answer])
                : q.question}
            </p>
            {selected !== null && (
              <SpeakButton text={q.question.replace(/_+/, q.options[q.answer])} audioPath={`/audio/questions/q-${q.id}.mp3`} size={34} />
            )}
          </div>
        </div>
      </div>
      )}

      <div style={{ padding: "0 20px" }}>
        {/* Part 3/4: 解答後に全3問の結果サマリー + 現在問の解説 */}
        {(selectedPart === 3 || selectedPart === 4) && p3IsSubmitted && (() => {
          const convLabels = ["A","B","C","D"];
          return (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {/* 3問サマリー */}
              <div style={{
                borderRadius: 16, padding: "14px 16px",
                background: "#F8FAFC", border: "1px solid #E2E8F0",
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 10 }}>
                  {selectedPart === 4 ? "スピーチ" : "会話"} {p3ConvIdx + 1} の結果
                </p>
                {[0, 1, 2].map(i => {
                  const qIdx = p3ConvStart + i;
                  if (qIdx >= quizQuestions.length) return null;
                  const tq = quizQuestions[qIdx];
                  const sel = part3Selections[qIdx] ?? -1;
                  const correct = sel === tq.answer;
                  const isCurrent = qIdx === current;
                  return (
                    <button
                      key={i}
                      onClick={() => { setCurrent(qIdx); setUserChoice(sel >= 0 ? `${convLabels[sel]}！` : null); }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        background: isCurrent ? "#EFF6FF" : "transparent",
                        border: isCurrent ? "1px solid #BFDBFE" : "1px solid transparent",
                        borderRadius: 10, padding: "8px 10px", cursor: "pointer",
                        marginBottom: i < 2 ? 4 : 0,
                      }}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                        background: correct ? "#22C55E" : "#F87171",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, color: "#fff", fontWeight: 700,
                      }}>{correct ? "○" : "×"}</span>
                      <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>
                        Q{i + 1}　選択: {sel >= 0 ? convLabels[sel] : "—"}　正解: {convLabels[tq.answer]}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* 現在問の解説 */}
              <div style={{
                borderRadius: 16, padding: "16px",
                background: (part3Selections[current] ?? -1) === q.answer ? "#F0FDF4" : "#FFF1F2",
                border: `1.5px solid ${(part3Selections[current] ?? -1) === q.answer ? "#86EFAC" : "#FECACA"}`,
              }}>
                <p style={{
                  fontSize: 12, fontWeight: 700, marginBottom: 6,
                  color: (part3Selections[current] ?? -1) === q.answer ? "#166534" : "#9F1239",
                }}>
                  {(part3Selections[current] ?? -1) === q.answer
                    ? "✓ 正解！"
                    : `✗ 不正解　正解は「${["A","B","C","D"][q.answer]}. ${q.options[q.answer]}」`}
                </p>
                <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-line" }}>{q.explanation}</p>
              </div>
              {/* 会話スクリプト (Part 3) */}
              {selectedPart === 3 && quizQuestions[p3ConvStart]?.conversation && (
                <div style={{
                  borderRadius: 16, padding: "16px",
                  background: "#F8FAFC", border: "1px solid #E2E8F0",
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 10 }}>📝 会話スクリプト</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {quizQuestions[p3ConvStart].conversation!.split("\n").map((line, li) => {
                      const isW = line.startsWith("W:");
                      const isM = line.startsWith("M:");
                      const sp = isW ? "W" : isM ? "M" : null;
                      const text = sp ? line.slice(2).trim() : line;
                      return (
                        <div key={li} style={{
                          display: "flex", gap: 8, alignItems: "flex-start",
                          flexDirection: isM ? "row-reverse" : "row",
                        }}>
                          {sp && (
                            <span style={{
                              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                              background: isW ? "#DBEAFE" : "#D1FAE5",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 700,
                              color: isW ? "#1D4ED8" : "#065F46",
                            }}>{sp}</span>
                          )}
                          <p style={{
                            fontSize: 13, color: "#374151", lineHeight: 1.65, margin: 0,
                            background: isW ? "#EFF6FF" : isM ? "#ECFDF5" : "transparent",
                            borderRadius: 10, padding: sp ? "6px 10px" : 0,
                            flex: 1,
                          }}>{text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* スピーチスクリプト (Part 4) */}
              {selectedPart === 4 && quizQuestions[p3ConvStart]?.monologue && (
                <div style={{
                  borderRadius: 16, padding: "16px",
                  background: "#F8FAFC", border: "1px solid #E2E8F0",
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", marginBottom: 10 }}>📝 スピーチスクリプト</p>
                  <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.75, margin: 0 }}>
                    {quizQuestions[p3ConvStart].monologue}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Part 5/6/7: 従来の解説パネル */}
        {selected !== null && selectedPart !== 3 && selectedPart !== 4 && (
          <div style={{
            marginTop: 16, borderRadius: 16, padding: "16px",
            background: selected === q.answer ? "#F0FDF4" : "#FFF1F2",
            border: `1.5px solid ${selected === q.answer ? "#86EFAC" : "#FECACA"}`,
          }}>
            <p style={{
              fontSize: 12, fontWeight: 700, marginBottom: 6,
              color: selected === q.answer ? "#166534" : "#9F1239",
            }}>
              {selected === q.answer ? "✓ 正解！" : `✗ 不正解　正解は「${["A", "B", "C", "D"][q.answer]}. ${q.options[q.answer]}」`}
            </p>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-line" }}>{explanation}</p>
          </div>
        )}

        {/* 問題文の日本語訳 - Part 5/6/7のみ（Part 3/4はリスニングなので不要） */}
        {selected !== null && selectedPart !== 1 && selectedPart !== 2 && selectedPart !== 3 && selectedPart !== 4 && (
          <div style={{
            marginTop: 10, borderRadius: 16, padding: "12px 16px",
            background: "#F8FAFC", border: "1px solid #E2E8F0",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 4 }}>📖 日本語訳</p>
            {translation
              ? <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{translation}</p>
              : <p style={{ fontSize: 13, color: "#94A3B8" }}>翻訳中…</p>
            }
          </div>
        )}
      </div>
    </div>
  );
}
