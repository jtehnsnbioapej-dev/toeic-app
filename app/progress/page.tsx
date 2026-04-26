"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProgress, getStreak, getWeakParts, getWordProgress } from "@/lib/storage";
import { vocabulary } from "@/data/vocabulary";
import PetScene from "@/components/PetScene";

export default function ProgressPage() {
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [weakParts, setWeakParts] = useState<{ part: string; rate: number }[]>([]);
  const [studyDays, setStudyDays] = useState(0);
  const [knownWords, setKnownWords] = useState(0);
  const [recentDays, setRecentDays] = useState<{ date: string; correct: number; total: number }[]>([]);
  const [petMessage, setPetMessage] = useState("今日も頑張ってるね！進捗を確認してみよう！");

  useEffect(() => {
    const progress = getProgress();
    const streak = getStreak();
    const weak = getWeakParts();
    const wordProgress = getWordProgress();

    const total = progress.reduce((s, p) => s + p.totalCount, 0);
    const correct = progress.reduce((s, p) => s + p.correctCount, 0);
    const known = Object.values(wordProgress).filter((v) => v === "known").length;

    setStreak(streak);
    setTotalCorrect(correct);
    setTotalQuestions(total);
    setWeakParts(weak);
    setStudyDays(progress.length);
    setKnownWords(known);

    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    if (total === 0) setPetMessage("まだ記録がないよ！一緒に最初の1問から始めよう！");
    else if (streak >= 7) setPetMessage(`${streak}日連続！すごい！この調子で続けよう！`);
    else if (rate >= 80) setPetMessage(`正答率${rate}%！めちゃくちゃ伸びてるよ！`);
    else if (rate >= 60) setPetMessage(`正答率${rate}%！着実に伸びてるね、もう少しだよ！`);
    else setPetMessage(`一緒にコツコツ頑張ろう！毎日続けることが大事だよ！`);

    // Last 7 days
    const last7: { date: string; correct: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const entry = progress.find((p) => p.date === dateStr);
      last7.push({
        date: dateStr,
        correct: entry?.correctCount || 0,
        total: entry?.totalCount || 0,
      });
    }
    setRecentDays(last7);
  }, []);

  const overallRate = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  const partLabels: { [key: string]: string } = {
    part5: "Part5（文法）",
    part6: "Part6（長文穴埋め）",
    part7: "Part7（読解）",
  };

  return (
    <div className="min-h-screen pb-10">
      <div className="bg-white border-b border-slate-100 px-5 pt-10 pb-5">
        <Link href="/" className="text-slate-500 text-sm">← ホーム</Link>
        <h1 className="text-xl font-bold mt-3">進捗確認</h1>
      </div>

      <PetScene message={petMessage} />

      <div className="px-5 mt-2 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl">🔥</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{streak}日</div>
            <div className="text-xs text-slate-500">連続記録</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl">📅</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{studyDays}日</div>
            <div className="text-xs text-slate-500">累計学習日数</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl">🎯</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{overallRate}%</div>
            <div className="text-xs text-slate-500">総合正答率</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <div className="text-3xl">📝</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{knownWords}<span className="text-sm font-normal text-slate-500">/{vocabulary.length}</span></div>
            <div className="text-xs text-slate-500">習得単語数</div>
          </div>
        </div>

        {/* Weekly activity */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="font-medium text-sm text-slate-600 mb-3">直近7日間の学習</h3>
          <div className="flex gap-1 items-end h-16">
            {recentDays.map((day) => {
              const rate = day.total > 0 ? day.total : 0;
              const maxH = 48;
              const h = rate > 0 ? Math.max(8, Math.min(maxH, (rate / 10) * maxH)) : 4;
              const dayName = ["日", "月", "火", "水", "木", "金", "土"][new Date(day.date + "T00:00:00").getDay()];
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-sm transition-all ${day.total > 0 ? "bg-blue-500" : "bg-slate-100"}`}
                    style={{ height: `${h}px` }}
                  />
                  <span className="text-xs text-slate-400">{dayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Part breakdown */}
        {weakParts.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <h3 className="font-medium text-sm text-slate-600 mb-3">Part別正答率</h3>
            <div className="space-y-3">
              {weakParts.map((w) => (
                <div key={w.part}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{partLabels[w.part] || w.part}</span>
                    <span className={`font-bold ${w.rate >= 70 ? "text-green-600" : w.rate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                      {w.rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${w.rate >= 70 ? "bg-green-400" : w.rate >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${w.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalQuestions === 0 && (
          <div className="bg-blue-50 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <p className="text-slate-700 font-medium">まだ記録がありません</p>
            <p className="text-slate-500 text-sm mt-1">「今日の3問」から始めよう！</p>
            <Link href="/quiz" className="inline-block mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
              クイズを始める
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
