"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { questions, Question, DIFFICULTY_LABELS } from "@/data/questions";
import translationsMap from "@/data/question-translations.json";
import { saveTodayProgress } from "@/lib/storage";
import PetScene from "@/components/PetScene";
import SpeakButton from "@/components/SpeakButton";

const QUIZ_COUNT = 10;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function shuffleOptions(q: Question): Question {
  const correct = q.options[q.answer];
  const shuffled = shuffle(q.options);
  return { ...q, options: shuffled, answer: shuffled.indexOf(correct) };
}

const isJapanese = (s: string) => /[\u3000-\u9FFF]/.test(s);

const PART_INFO: Record<number, { label: string; desc: string; icon: string }> = {
  5: { label: "Part 5", desc: "短文穴埋め", icon: "✏️" },
  6: { label: "Part 6", desc: "長文穴埋め", icon: "📄" },
  7: { label: "Part 7", desc: "読解問題",   icon: "📖" },
};

const CORRECT_MESSAGES = [
  "正解！やるじゃん！🎉",
  "さすが！その調子だよ！",
  "完璧！頭いいね〜！",
  "正解〜！一緒に頑張ろうね！",
];
const WRONG_MESSAGES = [
  "惜しい！でも大丈夫、一緒に覚えよう！",
  "次は絶対正解できるよ！",
  "難しいとこだよね、解説見てみよう！",
  "間違えたところが一番の学びだよ！",
];
const QUESTION_MESSAGES = [
  "この空欄に入るのはどれ？",
  "さあ、空欄を埋めてみて！",
  "この文を完成させて！",
  "どれが正しいか分かる？",
];

export default function PartPracticePage() {
  const [selectedPart, setSelectedPart] = useState<5 | 6 | 7 | null>(null);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [finished, setFinished] = useState(false);
  const [petMessage, setPetMessage] = useState("どのパートを練習する？");
  const [speaker, setSpeaker] = useState<"left" | "right">("right");
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [userEmotion, setUserEmotion] = useState<"idle" | "happy" | "sad" | "think" | "surprise">("idle");
  const [petEffect, setPetEffect] = useState<"correct" | "wrong" | null>(null);
  const [translation, setTranslation] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("globalDifficulty");
    if (saved) setDifficulty(Number(saved));
  }, []);

  const startPart = (part: 5 | 6 | 7) => {
    const filtered = questions.filter((q) =>
      q.part === part && q.difficulty === difficulty &&
      !isJapanese(q.question) && !q.options.some(isJapanese)
    );
    const picked = shuffle(filtered).slice(0, QUIZ_COUNT).map(shuffleOptions);
    setSelectedPart(part);
    setQuizQuestions(picked);
    setCurrent(0);
    setSelected(null);
    setResults([]);
    setExplanation("");
    setFinished(false);
    setUserChoice(null);
    setPetEffect(null);
    setUserEmotion("think");
    setPetMessage(QUESTION_MESSAGES[0]);
  };

  const q = quizQuestions[current];

  const handleSelect = (idx: number) => {
    if (selected !== null || !q) return;
    setSelected(idx);
    const correct = idx === q.answer;
    setResults((prev) => [...prev, correct]);
    saveTodayProgress(correct ? 1 : 0, 1, q.part);

    const reaction = correct
      ? CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)]
      : WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];

    setUserChoice(`${["A", "B", "C", "D"][idx]}！`);
    setSpeaker("right");
    setPetMessage(reaction);
    setExplanation(q.explanation);
    setTranslation("");

    // 問題文の日本語訳をJSONから取得（なければAPIにフォールバック）
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
    setTimeout(() => {
      setUserEmotion(correct ? "happy" : "sad");
    }, 100);
  };

  const handleNext = () => {
    setPetEffect(null);
    if (current + 1 >= quizQuestions.length) {
      setFinished(true);
    } else {
      setCurrent(current + 1);
      setSelected(null);
      setExplanation("");
      setTranslation("");
      setSpeaker("right");
      setUserChoice(null);
      setUserEmotion("think");
      setPetMessage(QUESTION_MESSAGES[Math.floor(Math.random() * QUESTION_MESSAGES.length)]);
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
              fontSize: 12, fontWeight: 800, color: "var(--primary)",
            }}>
              目標 {DIFFICULTY_LABELS[difficulty]}
            </div>
          </div>
        </div>

        <PetScene message="どのパートを練習する？" leftEmotion="idle" bg="/図書館.png" />

        <div style={{ padding: "20px 20px 100px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-sub)", marginBottom: 12 }}>パートを選んでください</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {([5, 6, 7] as const).map((part) => {
              const info = PART_INFO[part];
              const count = questions.filter(
                (q) => q.part === part && q.difficulty === difficulty &&
                !isJapanese(q.question) && !q.options.some(isJapanese)
              ).length;
              return (
                <button
                  key={part}
                  onClick={() => startPart(part)}
                  style={{
                    background: "#fff",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 18,
                    padding: "18px 20px",
                    display: "flex", alignItems: "center", gap: 16,
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
                    <p style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>{info.label}</p>
                    <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 2, fontWeight: 600 }}>{info.desc}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600 }}>{count}問</p>
                    <span style={{ color: "#D1D5DB", fontSize: 18 }}>›</span>
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
          <Link href="/part-practice" onClick={() => setSelectedPart(null)} style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none" }}>
            ← パート選択
          </Link>
        </div>

        <PetScene message={finishMsg} bg={selectedPart === 5 ? "/オフィス.png" : selectedPart === 6 ? "/自習室.png" : "/試験会場.png"} />

        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            background: "#fff", borderRadius: 24, padding: "28px 20px",
            textAlign: "center", boxShadow: "0 4px 20px rgba(56,178,240,0.12)",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700 }}>
              {PART_INFO[selectedPart].label} · 目標 {DIFFICULTY_LABELS[difficulty]} · {results.length}問
            </p>
            <p style={{ fontSize: 64, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginTop: 8 }}>
              {correct}
              <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-sub)" }}>/{results.length}</span>
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: rate >= 80 ? "#059669" : rate >= 60 ? "#D97706" : "#DC2626", marginTop: 4 }}>
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
            onClick={() => startPart(selectedPart)}
            style={{
              background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
              color: "#fff", borderRadius: 18, padding: "16px 0",
              fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(56,178,240,0.35)",
            }}
          >
            {PART_INFO[selectedPart].label} をもう一度
          </button>
          <button
            onClick={() => { setSelectedPart(null); setPetMessage("どのパートを練習する？"); }}
            style={{
              background: "#fff", border: "2px solid #E5E7EB",
              borderRadius: 18, padding: "14px 0",
              fontWeight: 800, fontSize: 15, color: "var(--text)", cursor: "pointer",
            }}
          >
            パートを選び直す
          </button>
        </div>
      </div>
    );
  }

  // ── 問題画面 ──────────────────────────────────────────
  if (!q) return null;
  const progress = (current / quizQuestions.length) * 100;

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
              fontSize: 12, fontWeight: 800, color: "var(--primary)",
            }}>
              {PART_INFO[selectedPart].label}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700 }}>
              {current + 1} / {quizQuestions.length}
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
          <PetScene message={petMessage} leftMessage={userChoice ?? undefined} speaker={speaker} leftEmotion={userEmotion} petEffect={petEffect} bg={selectedPart === 5 ? "/オフィス.png" : selectedPart === 6 ? "/自習室.png" : "/試験会場.png"} />

          {/* 選択肢オーバーレイ */}
          <div style={{
            position: "absolute",
            top: "62%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "36%",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            zIndex: 6,
            pointerEvents: "none",
          }}>
            {q.options.map((opt, idx) => {
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
                  style={{
                    background: bg, border, borderRadius: 12,
                    padding: "8px 10px", cursor: selected !== null ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 7,
                    textAlign: "left", width: "100%",
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
                    fontSize: 10, fontWeight: 800,
                    color: selected !== null
                      ? (idx === q.answer || idx === selected ? "#fff" : "#9CA3AF")
                      : "var(--primary)",
                  }}>
                    {["A", "B", "C", "D"][idx]}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 600, color, lineHeight: 1.3 }}>{opt}</span>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <button
              onClick={handleNext}
              style={{
                position: "absolute", bottom: 12, right: 12,
                background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
                color: "#fff", borderRadius: 20, padding: "8px 16px",
                fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer",
                boxShadow: "0 3px 10px rgba(56,178,240,0.45)",
                zIndex: 7,
              }}
            >
              {current + 1 >= quizQuestions.length ? "結果を見る →" : "次の問題 →"}
            </button>
          )}
        </div>
      </div>

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
              <SpeakButton text={q.question.replace(/_+/, q.options[q.answer])} size={34} />
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {selected !== null && (
          <div style={{
            marginTop: 16, borderRadius: 16, padding: "16px",
            background: selected === q.answer ? "#F0FDF4" : "#FFF1F2",
            border: `1.5px solid ${selected === q.answer ? "#86EFAC" : "#FECACA"}`,
          }}>
            <p style={{
              fontSize: 12, fontWeight: 800, marginBottom: 6,
              color: selected === q.answer ? "#166534" : "#9F1239",
            }}>
              {selected === q.answer ? "✓ 正解！" : `✗ 不正解　正解は「${["A", "B", "C", "D"][q.answer]}. ${q.options[q.answer]}」`}
            </p>
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-line" }}>{explanation}</p>
          </div>
        )}

        {/* 問題文の日本語訳 */}
        {selected !== null && (
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
