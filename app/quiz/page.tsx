"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { questions, Question, DIFFICULTY_LABELS } from "@/data/questions";
import { saveTodayProgress } from "@/lib/storage";
import PetScene from "@/components/PetScene";
import SpeakButton from "@/components/SpeakButton";

const QUIZ_COUNT = 10;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

// 選択肢をシャッフルして正解インデックスを更新
function shuffleOptions(q: Question): Question {
  const correct = q.options[q.answer];
  const shuffled = shuffle(q.options);
  return { ...q, options: shuffled, answer: shuffled.indexOf(correct) };
}

// 日本語文字を含む問題を除外
const isJapanese = (s: string) => /[\u3000-\u9FFF]/.test(s);

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

export default function QuizPage() {
  const [difficulty, setDifficulty] = useState<number>(3);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [finished, setFinished] = useState(false);
  const [petMessage, setPetMessage] = useState(
    QUESTION_MESSAGES[Math.floor(Math.random() * QUESTION_MESSAGES.length)]
  );
  const [speaker, setSpeaker] = useState<"left" | "right">("right");
  const [userChoice, setUserChoice] = useState<string | null>(null);
  const [userEmotion, setUserEmotion] = useState<"idle" | "happy" | "sad" | "think" | "surprise">("think");
  const [petEffect, setPetEffect] = useState<"correct" | "wrong" | null>(null);
  const [translation, setTranslation] = useState<string>("");

  // グローバル難易度設定をlocalStorageから読み込む
  useEffect(() => {
    const saved = localStorage.getItem("globalDifficulty");
    if (saved) setDifficulty(Number(saved));
  }, []);

  // 難易度が決まったら問題をセット
  useEffect(() => {
    if (difficulty === null) return;
    const filtered = questions.filter((q) =>
      q.difficulty === difficulty && !isJapanese(q.question) && !q.options.some(isJapanese)
    );
    const picked = shuffle(filtered).slice(0, QUIZ_COUNT).map(shuffleOptions);
    setQuizQuestions(picked);
    setCurrent(0);
    setSelected(null);
    setResults([]);
    setExplanation("");
    setFinished(false);
    setPetMessage(QUESTION_MESSAGES[0]);
  }, [difficulty]);

  const q = quizQuestions[current];

  const handleSelect = async (idx: number) => {
    if (selected !== null || !q) return;
    setSelected(idx);
    const correct = idx === q.answer;
    const newResults = [...results, correct];
    setResults(newResults);
    saveTodayProgress(correct ? 1 : 0, 1, q.part);

    const reaction = correct
      ? CORRECT_MESSAGES[Math.floor(Math.random() * CORRECT_MESSAGES.length)]
      : WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];

    // 左キャラが選んだ答えを言う → ペットが反応
    const choiceLabel = ["A", "B", "C", "D"][idx];
    setUserChoice(`${choiceLabel}！`);
    setSpeaker("right");
    setPetMessage(reaction);

    setExplanation(q.explanation);
    setTranslation("");
    setLoadingExplanation(true);

    // 問題文の日本語訳を並行取得
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: q.question.replace(/_+/, q.options[q.answer]) }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.translation) setTranslation(d.translation); })
      .catch(() => {});

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          options: q.options,
          answer: q.options[q.answer],
          selected: q.options[idx],
          part: q.part,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.explanation) {
          setExplanation(data.explanation);
          setPetMessage(data.explanation);
        }
      }
    } catch {
      // フォールバック: 組み込み解説を使用
    } finally {
      setLoadingExplanation(false);
      setPetEffect(correct ? "correct" : "wrong");
      setTimeout(() => {
        setUserEmotion(correct ? "happy" : "sad");
      }, 100);
    }
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

  const handleRetry = () => {
    const filtered = questions.filter((q) =>
      q.difficulty === difficulty && !isJapanese(q.question) && !q.options.some(isJapanese)
    );
    const picked = shuffle(filtered).slice(0, QUIZ_COUNT).map(shuffleOptions);
    setQuizQuestions(picked);
    setCurrent(0);
    setSelected(null);
    setResults([]);
    setExplanation("");
    setFinished(false);
    setUserChoice(null);
    setPetEffect(null);
    setTranslation("");
    setPetMessage(QUESTION_MESSAGES[0]);
  };

  if (quizQuestions.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--text-sub)" }}>問題を準備中...</p>
      </div>
    );
  }

  // ── 結果画面 ──────────────────────────────────────────
  if (finished) {
    const correct = results.filter(Boolean).length;
    const rate = Math.round((correct / QUIZ_COUNT) * 100);
    const finishMsg =
      rate === 100 ? "パーフェクト！すごすぎる！🎉" :
      rate >= 80  ? "すごい！よく頑張ったね！" :
      rate >= 60  ? "いい調子！毎日続ければ伸びるよ！" :
      "次は絶対できる！一緒に練習しよう！";

    return (
      <div className="page-wrap min-h-screen" style={{ background: "var(--bg)" }}>
        <div style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "52px 20px 20px",
        }}>
          <Link href="/" style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none" }}>
            ← ホーム
          </Link>
        </div>

        <PetScene message={finishMsg} bg="/教室.png" />

        <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* スコアカード */}
          <div style={{
            background: "#fff", borderRadius: 24, padding: "28px 20px",
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(56,178,240,0.12)",
          }}>
            <p style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700 }}>
              目標 {DIFFICULTY_LABELS[difficulty]} · {QUIZ_COUNT}問
            </p>
            <p style={{ fontSize: 64, fontWeight: 900, color: "var(--text)", lineHeight: 1.1, marginTop: 8 }}>
              {correct}
              <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-sub)" }}>/{QUIZ_COUNT}</span>
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: rate >= 80 ? "#059669" : rate >= 60 ? "#D97706" : "#DC2626", marginTop: 4 }}>
              正答率 {rate}%
            </p>

            {/* 問題ごとの結果バー */}
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

          {/* ボタン */}
          <button
            onClick={handleRetry}
            style={{
              background: "linear-gradient(135deg, #38B2F0, #1A90D4)",
              color: "#fff", borderRadius: 18, padding: "16px 0",
              fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(56,178,240,0.35)",
            }}
          >
            もう一度 {DIFFICULTY_LABELS[difficulty]}
          </button>
          <Link href="/" style={{
            display: "block", textAlign: "center",
            background: "#fff", border: "2px solid #E5E7EB",
            borderRadius: 18, padding: "14px 0",
            fontWeight: 800, fontSize: 15, color: "var(--text)", textDecoration: "none",
          }}>
            目標スコアを変える
          </Link>
          <Link href="/" style={{
            display: "block", textAlign: "center",
            color: "var(--text-sub)", fontWeight: 700, fontSize: 14, textDecoration: "none", padding: "8px 0",
          }}>
            ホームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  // ── 問題画面 ──────────────────────────────────────────
  const progress = ((current) / quizQuestions.length) * 100;

  return (
    <div className="page-wrap min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ヘッダー + ペット + 問題文（固定） */}
      <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
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
          <span style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700 }}>
            {current + 1} / {quizQuestions.length}
          </span>
        </div>

        {/* プログレスバー */}
        <div style={{ height: 6, background: "rgba(56,178,240,0.2)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", background: "var(--primary)", borderRadius: 99,
            width: `${progress}%`, transition: "width 0.3s ease",
          }} />
        </div>

        <div style={{ marginTop: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--primary)",
            background: "rgba(56,178,240,0.12)", padding: "3px 10px", borderRadius: 20,
          }}>
            Part {q.part}
          </span>
        </div>
      </div>

      {/* ペット */}
      <div style={{ position: "relative" }}>
        <PetScene message={petMessage} leftMessage={userChoice ?? undefined} isLoading={loadingExplanation && selected !== null} speaker={speaker} leftEmotion={userEmotion} petEffect={petEffect} bg="/教室.png" />
        {/* 選択肢オーバーレイ（中央横幅60%・縦中央・キャラ顔は左右に残る） */}
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

      {/* 問題文 */}
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
      </div>{/* sticky end */}

      <div style={{ padding: "0 20px" }}>
        {/* 解説 */}
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
            {loadingExplanation
              ? <p style={{ fontSize: 13, color: "#6B7280" }}>解説を読み込み中…</p>
              : <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-line" }}>{explanation}</p>
            }
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
              ? <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>{translation}</p>
              : <p style={{ fontSize: 13, color: "#94A3B8" }}>翻訳中…</p>
            }
          </div>
        )}


      </div>
    </div>
  );
}
