"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStreak, getProgress, getWeakParts } from "@/lib/storage";
import { HOME_GREETINGS } from "@/lib/petMessages";
import { questions, DIFFICULTY_LABELS } from "@/data/questions";
import { vocabulary } from "@/data/vocabulary";
import { DEFAULT_PET_IMAGES } from "@/lib/petImages";
import { getActivePetName } from "@/lib/characterStorage";
import PetScene from "@/components/PetScene";

type PetProfile = { name: string; type: string; emotions?: Record<string, string> };

const DIFFICULTY_META: Record<number, { label: string; sub: string; color: string; bg: string; border: string }> = {
  1: { label: "500点",  sub: "入門・基礎",     color: "#22C55E", bg: "#F0FDF4", border: "#86EFAC" },
  2: { label: "600点",  sub: "基本ビジネス",   color: "#3B82F6", bg: "#EFF6FF", border: "#93C5FD" },
  3: { label: "700点",  sub: "標準ビジネス",   color: "#F59E0B", bg: "#FFFBEB", border: "#FCD34D" },
  4: { label: "800点",  sub: "上級ビジネス",   color: "#F43F5E", bg: "#FFF1F2", border: "#FDA4AF" },
  5: { label: "900点",  sub: "ネイティブ級",   color: "#A855F7", bg: "#FAF5FF", border: "#C084FC" },
};

const buildMenu = (diff: number) => [
  { href: "/quiz",     icon: "🎯", label: "今日の10問", sub: "ランダム出題",                                              color: "#38B2F0", bg: "#E8F6FE" },
  { href: "/part-practice", icon: "📖", label: "Part練習",   sub: "Part5・6・7",                                              color: "#A78BFA", bg: "#F3F0FF" },
  { href: "/vocab",    icon: "📝", label: "単語カード", sub: `頻出${vocabulary.filter((w) => w.difficulty === diff).length}語`, color: "#34D399", bg: "#ECFDF5" },
  { href: "/progress", icon: "📊", label: "進捗",       sub: "記録・正答率",                                             color: "#FB923C", bg: "#FFF4ED" },
];

function getGreeting(streak: number): string {
  if (streak >= 7) return `${streak}日連続！すごい！`;
  if (streak >= 3) return `${streak}日連続！この調子！`;
  return HOME_GREETINGS[Math.floor(Date.now() / 86400000) % HOME_GREETINGS.length];
}

export default function Home() {
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [changingDifficulty, setChangingDifficulty] = useState(false);
  const [petName, setPetName] = useState("ペット");
  const [streak, setStreak] = useState(0);
  const [todayStats, setTodayStats] = useState({ correct: 0, total: 0 });
  const [weakParts, setWeakParts] = useState<{ part: string; rate: number }[]>([]);

  useEffect(() => {
    const savedPet = localStorage.getItem("petProfile");
    if (savedPet) setPet(JSON.parse(savedPet));
    setPetName(getActivePetName());
    const savedDiff = localStorage.getItem("globalDifficulty");
    if (savedDiff) setDifficulty(Number(savedDiff));
    setStreak(getStreak());
    const today = new Date().toISOString().split("T")[0];
    const all = getProgress();
    const todayEntry = all.find((p) => p.date === today);
    if (todayEntry) setTodayStats({ correct: todayEntry.correctCount, total: todayEntry.totalCount });
    setWeakParts(getWeakParts());
    setLoaded(true);
  }, []);

  const handleDifficultySelect = (d: number) => {
    localStorage.setItem("globalDifficulty", String(d));
    setDifficulty(d);
    setChangingDifficulty(false);
  };

  if (!loaded) return null;

  // デモ用デフォルトペット（未登録時はデモキャラを使用）
  const demoPet = pet ?? { name: petName, type: "猫", emotions: DEFAULT_PET_IMAGES };
  const activePetName = petName;

  // ── ② 目標スコア未設定 or 変更中 ──────────────────────
  if (!difficulty || changingDifficulty) {
    const diffCount = (d: number) => questions.filter((q) => q.difficulty === d).length;
    return (
      <div className="page-wrap min-h-screen" style={{ background: "var(--bg)" }}>
        <div style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "52px 20px 28px",
        }}>
          {changingDifficulty && (
            <button onClick={() => setChangingDifficulty(false)} style={{
              fontSize: 13, color: "var(--text-sub)", fontWeight: 700,
              background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12,
            }}>← 戻る</button>
          )}
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px" }}>
            目標スコアを設定しよう
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 6, fontWeight: 600 }}>
            {changingDifficulty ? "変更後の目標を選んでください" : "設定後もいつでも変更できます"}
          </p>
        </div>

        <div style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3, 4, 5].map((d) => {
            const m = DIFFICULTY_META[d];
            const current = difficulty === d && !changingDifficulty;
            return (
              <button
                key={d}
                onClick={() => handleDifficultySelect(d)}
                style={{
                  background: m.bg, border: `2px solid ${current ? m.color : m.border}`,
                  borderRadius: 20, padding: "18px 20px",
                  display: "flex", alignItems: "center", gap: 16,
                  cursor: "pointer", textAlign: "left", width: "100%",
                  boxShadow: current ? `0 4px 16px ${m.color}30` : "none",
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: m.color,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: "#fff", fontWeight: 900, fontSize: 14 }}>{m.label}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: m.color }}>{m.sub}</p>
                  <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 3, fontWeight: 600 }}>
                    全{diffCount(d)}問収録
                  </p>
                </div>
                {current && <span style={{ fontSize: 18 }}>✓</span>}
                {!current && <span style={{ color: "var(--text-sub)", fontSize: 20 }}>›</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── ③ メイン画面 ───────────────────────────────────────
  const todayRate = todayStats.total > 0
    ? Math.round((todayStats.correct / todayStats.total) * 100)
    : null;
  const dm = DIFFICULTY_META[difficulty];

  return (
    <div className="page-wrap min-h-screen">
      {/* 名前 + ストリーク + キャラクターシーン（スクロール固定） */}
      <div style={{ position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{
        background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
        padding: "52px 20px 12px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <p style={{ fontSize: 13, color: "#7B8FA6", fontWeight: 600 }}>おかえり！</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", letterSpacing: "-0.3px", marginTop: 2 }}>
            {petName}と練習しよう
          </h1>
        </div>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          background: streak > 0 ? "#FFF4ED" : "#F3F4F6",
          border: `2px solid ${streak > 0 ? "#FB923C" : "#E5E7EB"}`,
          borderRadius: 16, padding: "8px 14px",
        }}>
          <span style={{ fontSize: 22 }}>{streak > 0 ? "🔥" : "💤"}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: streak > 0 ? "#EA580C" : "#9CA3AF" }}>{streak}日</span>
        </div>
      </div>

      {/* キャラクターシーン */}
      <PetScene message={getGreeting(streak)} bg="/自室.png" />
      </div>{/* sticky end */}

      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* 目標スコア表示 */}
        <button
          onClick={() => setChangingDifficulty(true)}
          style={{
            background: dm.bg, border: `2px solid ${dm.border}`,
            borderRadius: 16, padding: "12px 18px",
            display: "flex", alignItems: "center", gap: 12,
            cursor: "pointer", width: "100%", textAlign: "left",
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: dm.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 900, color: "#fff", flexShrink: 0,
          }}>
            {dm.label}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 700 }}>現在の目標スコア</p>
            <p style={{ fontSize: 14, fontWeight: 800, color: dm.color, marginTop: 2 }}>{dm.sub}</p>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-sub)", fontWeight: 700 }}>変更 ›</span>
        </button>

        {/* 今日の成績 */}
        {todayStats.total > 0 && (
          <div style={{
            background: "#fff", borderRadius: 20, padding: "16px 20px",
            boxShadow: "0 2px 12px rgba(56,178,240,0.1)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 700 }}>今日の成績</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: "var(--text)", marginTop: 4 }}>
                {todayStats.correct}
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-sub)" }}>/{todayStats.total}問</span>
              </p>
            </div>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: todayRate && todayRate >= 80 ? "#ECFDF5" : "#FFF4ED",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `3px solid ${todayRate && todayRate >= 80 ? "#34D399" : "#FB923C"}`,
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: todayRate && todayRate >= 80 ? "#059669" : "#EA580C" }}>
                {todayRate}%
              </span>
            </div>
          </div>
        )}

        {/* 苦手パート */}
        {weakParts.length > 0 && (
          <div style={{
            background: "#FFFBEB", border: "1.5px solid #FDE68A",
            borderRadius: 16, padding: "14px 18px",
          }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#B45309" }}>
              ⚡ {petName}がもっと練習しようって言ってるパート
            </p>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {weakParts.slice(0, 2).map((w) => (
                <div key={w.part} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#92400E", fontWeight: 700 }}>Part {w.part.replace("part", "")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 80, height: 7, background: "#FEF3C7", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ width: `${w.rate}%`, height: "100%", background: "#F59E0B", borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#B45309" }}>{w.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 学習メニュー */}
        <p style={{ fontSize: 12, fontWeight: 800, color: "var(--text-sub)", letterSpacing: "0.06em" }}>STUDY MENU</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: -8 }}>
          {buildMenu(difficulty).map((item) => (
            <Link key={item.href} href={item.href} style={{
              background: "#fff", borderRadius: 20, padding: "18px 16px",
              textDecoration: "none", display: "block",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: "1.5px solid rgba(0,0,0,0.04)",
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, background: item.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, marginBottom: 10,
              }}>{item.icon}</div>
              <p style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{item.label}</p>
              <p style={{ fontSize: 11, color: "var(--text-sub)", marginTop: 3, fontWeight: 600 }}>{item.sub}</p>
            </Link>
          ))}
        </div>


      </div>
    </div>
  );
}
