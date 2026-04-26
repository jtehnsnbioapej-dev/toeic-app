"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { questions, Question, DIFFICULTY_LABELS } from "@/data/questions";
import { saveTodayProgress } from "@/lib/storage";
import SpeakButton from "@/components/SpeakButton";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function PracticePage() {
  const [selectedPart, setSelectedPart] = useState<5 | 6 | 7 | null>(null);
  const [practiceQ, setPracticeQ] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState(3);

  useEffect(() => {
    const saved = localStorage.getItem("globalDifficulty");
    if (saved) setDifficulty(Number(saved));
  }, []);

  const difficultyQuestions = questions.filter((q) => q.difficulty === difficulty);

  const partInfo = [
    { part: 5 as const, label: "Part 5", desc: "短文穴埋め問題", count: difficultyQuestions.filter((q) => q.part === 5).length, color: "bg-purple-600" },
    { part: 6 as const, label: "Part 6", desc: "長文穴埋め問題", count: difficultyQuestions.filter((q) => q.part === 6).length, color: "bg-orange-500" },
    { part: 7 as const, label: "Part 7", desc: "読解問題",       count: difficultyQuestions.filter((q) => q.part === 7).length, color: "bg-teal-600" },
  ];

  const startPractice = (part: 5 | 6 | 7) => {
    const filtered = shuffle(difficultyQuestions.filter((q) => q.part === part));
    setSelectedPart(part);
    setPracticeQ(filtered);
    setCurrent(0);
    setSelected(null);
  };

  const q = practiceQ[current];

  if (!selectedPart) {
    return (
      <div className="min-h-screen pb-10">
        <div className="bg-white border-b border-slate-100 px-5 pt-10 pb-5">
          <Link href="/" className="text-slate-500 text-sm">← ホーム</Link>
          <h1 className="text-xl font-bold mt-3">Part別練習</h1>
          <p className="text-sm text-slate-500 mt-1">目標 {DIFFICULTY_LABELS[difficulty]}</p>
        </div>

        <div className="px-5 mt-6 space-y-4">
          {partInfo.map(({ part, label, desc, count, color }) => (
            <button
              key={part}
              onClick={() => startPractice(part)}
              className={`w-full ${color} text-white rounded-2xl p-5 text-left shadow-sm hover:opacity-90 active:scale-98 transition-all`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{label}</div>
                  <div className="text-white/80 text-sm mt-1">{desc}</div>
                </div>
                <span className="text-white/70 text-sm">{count}問</span>
              </div>
            </button>
          ))}

          <div className="bg-slate-50 rounded-2xl p-4 mt-2">
            <p className="text-sm text-slate-600 leading-relaxed">
              {difficulty === 1 && <><strong>500点目標</strong> の方は<br />Part5の基本文法から始めましょう。<br />まずPart5で土台を作るのがおすすめ！</>}
              {difficulty === 2 && <><strong>600点目標</strong> の方は<br />Part5の語彙・文法を繰り返し練習。<br />Part6の文脈把握も意識しましょう！</>}
              {difficulty === 3 && <><strong>700点目標</strong> の方は<br />Part5を素早く解いてPart7の時間を確保。<br />Part6の流れ読みも強化しましょう！</>}
              {difficulty === 4 && <><strong>800点目標</strong> の方は<br />Part7のダブルパッセージに慣れることが鍵。<br />Part5はほぼ満点を目指しましょう！</>}
              {difficulty === 5 && <><strong>900点目標</strong> の方は<br />Part7のトリプルパッセージまで確実に。<br />細かいニュアンスの違いを意識して！</>}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <div className="text-5xl mb-4">🏁</div>
        <h2 className="text-xl font-bold">Part {selectedPart} 完了！</h2>
        <p className="text-slate-500 mt-2 text-sm">全問解き終えました</p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => startPractice(selectedPart)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium"
          >
            もう一度
          </button>
          <button
            onClick={() => setSelectedPart(null)}
            className="bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-medium"
          >
            別のPartへ
          </button>
        </div>
      </div>
    );
  }

  const partColor = q.part === 5 ? "bg-purple-600" : q.part === 6 ? "bg-orange-500" : "bg-teal-600";

  return (
    <div className="min-h-screen pb-10">
      <div className={`${partColor} text-white px-5 pt-10 pb-6`}>
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedPart(null)} className="text-white/70 text-sm">
            ← 戻る
          </button>
          <span className="text-white/70 text-sm">{current + 1} / {practiceQ.length}</span>
        </div>
        <h2 className="text-lg font-bold mt-3">Part {q.part}</h2>
      </div>

      <div className="px-5 mt-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-start gap-3">
            <p className="text-slate-800 leading-relaxed whitespace-pre-line text-sm flex-1">
              {selected !== null
                ? q.question.replace(/_+/, q.options[q.answer])
                : q.question}
            </p>
            {selected !== null && (
              <SpeakButton text={q.question.replace(/_+/, q.options[q.answer])} size={34} />
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {q.options.map((opt, idx) => {
            let style = "bg-white border-slate-200 text-slate-800";
            if (selected !== null) {
              if (idx === q.answer) style = "bg-green-50 border-green-400 text-green-800";
              else if (idx === selected) style = "bg-red-50 border-red-400 text-red-800";
              else style = "bg-white border-slate-200 text-slate-400";
            }
            return (
              <button
                key={idx}
                onClick={() => {
                  if (selected !== null) return;
                  setSelected(idx);
                  saveTodayProgress(idx === q.answer ? 1 : 0, 1, q.part);
                }}
                className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-medium transition-all ${style}`}
              >
                <span className="text-xs opacity-60 mr-2">{["A", "B", "C", "D"][idx]}.</span>
                {opt}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className={`mt-4 rounded-2xl p-4 ${selected === q.answer ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <p className="text-sm font-medium mb-2">
              {selected === q.answer ? "✅ 正解！" : `❌ 正解：「${q.options[q.answer]}」`}
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
            <button
              onClick={() => {
                setCurrent((c) => c + 1);
                setSelected(null);
              }}
              className="mt-4 w-full bg-blue-600 text-white py-3 rounded-xl font-medium"
            >
              次の問題 →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
