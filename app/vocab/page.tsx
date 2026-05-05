"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { vocabulary, Word } from "@/data/vocabulary";
import { getWordProgress, saveWordProgress } from "@/lib/storage";
import PetScene from "@/components/PetScene";
import SpeakButton from "@/components/SpeakButton";

export default function VocabPage() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState<{ [id: number]: "known" | "unknown" | "unseen" }>({});
  const [filter, setFilter] = useState<"all" | "unknown">("all");
  const [difficulty, setDifficulty] = useState(3);
  const [petMessage, setPetMessage] = useState("この単語、一緒に覚えよう！タップして意味を確認してみて！");
  const [leftChoice, setLeftChoice] = useState<string | null>(null);
  const [userEmotion, setUserEmotion] = useState<"idle" | "happy" | "sad" | "think" | "surprise">("think");
  const [petEffect, setPetEffect] = useState<"correct" | "wrong" | null>(null);

  const VOCAB_CHOICES = [
    { label: "覚えた！", value: "known" },
    { label: "分からなかった・・・", value: "unknown" },
  ];

  const EXAMPLE_INTROS = [
    "こんなふうに使うよ！",
    "例えばこんな文で使われるよ！",
    "実際の文で確認してみて！",
    "使い方の例はこれだよ！",
  ];

  useEffect(() => {
    setProgress(getWordProgress() as { [id: number]: "known" | "unknown" | "unseen" });
    const saved = localStorage.getItem("globalDifficulty");
    if (saved) setDifficulty(Number(saved));
  }, []);

  const difficultyWords = vocabulary.filter((w) => w.difficulty === difficulty);

  const filtered = filter === "unknown"
    ? difficultyWords.filter((w) => progress[w.id] !== "known")
    : difficultyWords;

  const word: Word | undefined = filtered[index];

  const handleKnown = () => {
    if (!word) return;
    saveWordProgress(word.id, "known");
    setProgress((prev) => ({ ...prev, [word.id]: "known" }));
    setFlipped(false);
    setLeftChoice(null);
    setIndex((i) => Math.min(i + 1, filtered.length - 1));
    const msgs = ["完璧！どんどん覚えてるね！", "さすが！その調子！", "覚えた！すごいじゃん！"];
    setPetMessage(msgs[Math.floor(Math.random() * msgs.length)]);
  };

  const handleUnknown = () => {
    if (!word) return;
    saveWordProgress(word.id, "unknown");
    setProgress((prev) => ({ ...prev, [word.id]: "unknown" }));
    setFlipped(false);
    setLeftChoice(null);
    setIndex((i) => Math.min(i + 1, filtered.length - 1));
    const msgs = ["大丈夫！繰り返せば絶対覚えられるよ！", "また後で一緒に復習しよう！", "難しい単語も少しずつね！"];
    setPetMessage(msgs[Math.floor(Math.random() * msgs.length)]);
  };

  const handleNav = (newIndex: number) => {
    setIndex(newIndex);
    setFlipped(false);
    setLeftChoice(null);
    setUserEmotion("think");
    setPetEffect(null);
    setPetMessage("この単語、一緒に覚えよう！タップして意味を確認してみて！");
  };

  const handleLeftChoice = (value: string) => {
    if (!word) return;
    const isKnown = value === "known";
    setLeftChoice(isKnown ? "覚えた！" : "分からなかった・・・");
    saveWordProgress(word.id, isKnown ? "known" : "unknown");
    setProgress((prev) => ({ ...prev, [word.id]: isKnown ? "known" : "unknown" }));
    const msgs = isKnown
      ? ["完璧！どんどん覚えてるね！", "さすが！その調子！", "覚えた！すごいじゃん！"]
      : ["大丈夫！繰り返せば絶対覚えられるよ！", "また後で一緒に復習しよう！", "難しい単語も少しずつね！"];
    setPetMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    setUserEmotion(isKnown ? "happy" : "sad");
    setPetEffect(isKnown ? "correct" : "wrong");
    setTimeout(() => {
      setFlipped(false);
      setLeftChoice(null);
      setUserEmotion("think");
      setPetEffect(null);
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
      setPetMessage("この単語、一緒に覚えよう！タップして意味を確認してみて！");
    }, 2000);
  };

  useEffect(() => {
    if (!flipped || !word) return;
    const intro = EXAMPLE_INTROS[Math.floor(Math.random() * EXAMPLE_INTROS.length)];
    setPetMessage(`${intro}\n"${word.example.trim()}"`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, word?.id]);

  const knownCount = difficultyWords.filter((w) => progress[w.id] === "known").length;
  const unknownCount = difficultyWords.filter((w) => progress[w.id] === "unknown").length;

  if (filtered.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold">全単語習得！</h2>
        <p className="text-slate-500 mt-2 text-sm">フィルターを「全て」に変えると復習できます</p>
        <button
          onClick={() => setFilter("all")}
          className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-2xl font-medium"
        >
          全て表示
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Header + PetScene（固定） */}
      <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
      <div className="bg-white border-b border-slate-100 px-5 pt-10 pb-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-slate-500 text-sm">← ホーム</Link>
          <span className="text-sm text-slate-500">{index + 1} / {filtered.length}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => { setFilter("all"); setIndex(0); }}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            全て ({difficultyWords.length})
          </button>
          <button
            onClick={() => { setFilter("unknown"); setIndex(0); }}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filter === "unknown" ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            要復習 ({unknownCount})
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${difficultyWords.length > 0 ? (knownCount / difficultyWords.length) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1">習得済み {knownCount} / {difficultyWords.length}語</p>
      </div>

      <PetScene
        message={petMessage}
        leftMessage={leftChoice ?? undefined}
        leftChoices={flipped && !leftChoice ? VOCAB_CHOICES : undefined}
        onLeftChoice={handleLeftChoice}
        leftEmotion={userEmotion}
        petEffect={petEffect}
        bg="/カフェ.png"
      />
      </div>{/* sticky end */}

      <div className="px-5 mt-2">
        {/* Card */}
        <div
          onClick={() => {
          const next = !flipped;
          setFlipped(next);
          setLeftChoice(null);
          if (!next) {
            setPetMessage("この単語、一緒に覚えよう！タップして意味を確認してみて！");
          }
        }}
          className="bg-white rounded-2xl shadow-md border border-slate-100 p-5 min-h-32 flex flex-col items-center justify-center cursor-pointer active:scale-98 transition-transform select-none"
        >
          {!flipped ? (
            <div className="text-center">
              <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{word.part}</span>
              <div className="flex items-center justify-center gap-2 mt-3">
                <h2 className="text-2xl font-bold text-slate-800">{word.word}</h2>
                <SpeakButton text={word.word} audioPath={`/audio/vocab/${word.id}.mp3`} size={30} />
              </div>
              <p className="text-slate-400 text-xs mt-3">タップで意味を確認</p>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-xs bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{word.part}</span>
              <div className="flex items-center justify-center gap-2 mt-2">
                <h2 className="text-2xl font-bold text-slate-800">{word.word}</h2>
                <SpeakButton text={word.word} audioPath={`/audio/vocab/${word.id}.mp3`} size={30} />
              </div>
              <p className="text-lg font-medium text-blue-600 mt-2">{word.meaning}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-2 mt-4 justify-center">
          <button
            onClick={() => handleNav(Math.max(0, index - 1))}
            disabled={index === 0}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-30 text-sm"
          >
            ← 前へ
          </button>
          <button
            onClick={() => handleNav(Math.min(filtered.length - 1, index + 1))}
            disabled={index === filtered.length - 1}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 disabled:opacity-30 text-sm"
          >
            次へ →
          </button>
        </div>
      </div>
    </div>
  );
}
