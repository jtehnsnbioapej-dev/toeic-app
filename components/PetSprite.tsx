"use client";

import React, { useEffect, useRef, useState } from "react";

// 背景除去（緑・マゼンタの単色背景を透明化）
const BG_CACHE_VERSION = 10;
const bgCache = new Map<string, string>();
function removeBg(src: string): Promise<string> {
  const cacheKey = `${src}@v${BG_CACHE_VERSION}`;
  if (bgCache.has(cacheKey)) return Promise.resolve(bgCache.get(cacheKey)!);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      try {
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;

        // エッジ全体をサンプリングして最頻出の色を背景色として検出
        const edgeSamples: number[] = [];
        const step = Math.max(1, Math.floor(Math.min(w, h) / 20));
        for (let x = 0; x < w; x += step) {
          edgeSamples.push(x);
          edgeSamples.push(x + (h - 1) * w);
        }
        for (let y = 1; y < h - 1; y += step) {
          edgeSamples.push(y * w);
          edgeSamples.push((w - 1) + y * w);
        }
        // 32段階に量子化して最頻出の色グループを背景色とする（透過済みピクセルはスキップ）
        const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (const pos of edgeSamples) {
          const i = pos * 4;
          if (d[i + 3] === 0) continue; // すでに透過済みはスキップ
          const qr = Math.round(d[i] / 32) * 32;
          const qg = Math.round(d[i+1] / 32) * 32;
          const qb = Math.round(d[i+2] / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          const cur = colorBuckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
          colorBuckets.set(key, { count: cur.count + 1, r: d[i], g: d[i+1], b: d[i+2] });
        }
        if (colorBuckets.size === 0) { resolve(src); return; } // 全エッジ透過済みならスキップ
        const dominant = [...colorBuckets.values()].sort((a, b) => b.count - a.count)[0];
        const bgR = dominant.r, bgG = dominant.g, bgB = dominant.b;
        const tol = 40;
        const isBg = (r: number, g: number, b: number) =>
          Math.abs(r - bgR) <= tol && Math.abs(g - bgG) <= tol && Math.abs(b - bgB) <= tol;
        const visited = new Uint8Array(w * h);
        const queue: number[] = [];
        for (let x = 0; x < w; x++) { queue.push(x); queue.push(x + (h - 1) * w); }
        for (let y = 1; y < h - 1; y++) { queue.push(y * w); queue.push((w - 1) + y * w); }
        while (queue.length) {
          const pos = queue.pop()!;
          if (visited[pos]) continue;
          visited[pos] = 1;
          const i = pos * 4;
          if (isBg(d[i], d[i+1], d[i+2])) {
            d[i+3] = 0;
            const x = pos % w, y = Math.floor(pos / w);
            if (x > 0) queue.push(pos - 1);
            if (x < w - 1) queue.push(pos + 1);
            if (y > 0) queue.push(pos - w);
            if (y < h - 1) queue.push(pos + w);
          }
        }

        // フラッドフィルで届かなかった囲み領域（足の間など）を全スキャンで透過
        for (let pos = 0; pos < w * h; pos++) {
          if (visited[pos]) continue;
          const i = pos * 4;
          if (isBg(d[i], d[i+1], d[i+2])) d[i+3] = 0;
        }

        ctx.putImageData(id, 0, 0);
        const result = canvas.toDataURL("image/png");
        bgCache.set(cacheKey, result);
        resolve(result);
      } catch (e) {
        console.error("[removeBg] canvas error:", e, src);
        bgCache.set(cacheKey, src);
        resolve(src);
      }
    };
    img.onerror = (e) => { console.error("[removeBg] load error:", e, src); bgCache.set(cacheKey, src); resolve(src); };
    img.src = src;
  });
}

export type Emotion = "idle" | "happy" | "sad" | "think" | "excited";
export type PetImages = Partial<Record<Emotion, string>>;

const EMOTION_BADGE: Partial<Record<Emotion, string>> = {
  happy: "😊",
  sad: "😢",
  think: "🤔",
  excited: "🤩",
};

interface Props {
  images: PetImages;
  emotion: Emotion;
  size?: number;
  noAnimate?: boolean;
  flipped?: boolean;
}

const CSS = `
  .ps-root { display: inline-block; transform-origin: bottom center; }
  .ps-root img { display: block; object-fit: contain; }

  @keyframes psSlideIn {
    0%   { transform: translateY(32px); opacity: 0; }
    100% { transform: translateY(0px);  opacity: 1; }
  }
  @keyframes psFloat {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-10px); }
  }
  @keyframes psBounce {
    0%,100% { transform: translateY(0px) scaleX(1) scaleY(1); }
    40%     { transform: translateY(-26px) scaleX(1.08) scaleY(0.92); }
    55%     { transform: translateY(-26px) scaleX(0.93) scaleY(1.07); }
    80%     { transform: translateY(-5px) scaleX(1.02) scaleY(0.98); }
  }
  @keyframes psWobble {
    0%,100% { transform: rotate(0deg) translateX(0px); }
    25%     { transform: rotate(-5deg) translateX(-6px); }
    75%     { transform: rotate(5deg) translateX(6px); }
  }
  @keyframes psTilt {
    0%,100% { transform: rotate(0deg); }
    35%     { transform: rotate(-8deg); }
    70%     { transform: rotate(8deg); }
  }
  @keyframes psPop {
    0%   { transform: scale(0.6); opacity: 0.3; }
    65%  { transform: scale(1.14); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes psShakeUser {
    0%   { transform: rotate(0deg); }
    25%  { transform: rotate(-6deg); }
    75%  { transform: rotate(6deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes psExcitedPet {
    0%   { transform: translateY(0px); }
    22%  { transform: translateY(-36px); }
    42%  { transform: translateY(-30px); }
    62%  { transform: translateY(0px); }
    78%  { transform: translateY(-14px); }
    100% { transform: translateY(0px); }
  }
  @keyframes psStarBurst {
    0%   { transform: translate(0, 0) scale(0); opacity: 0; }
    18%  { transform: translate(calc(var(--star-dx) * 0.12), calc(var(--star-dy) * 0.12)) scale(1.6); opacity: 1; }
    100% { transform: translate(var(--star-dx), var(--star-dy)) scale(0.1); opacity: 0; }
  }
`;

const ENTRY: React.CSSProperties = {
  animation: "psSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
};

const ANIM: Record<Emotion, React.CSSProperties> = {
  idle:     {},
  happy:    { animation: "psBounce 0.6s ease-in-out 1" },
  sad:      { animation: "psWobble 0.7s ease-in-out 1", filter: "brightness(0.85) saturate(0.7)" },
  think:    { animation: "psTilt 2.2s ease-in-out 1" },
  excited: { animation: "psExcitedPet 0.65s ease-in-out 1" },
};

// 全星を左上方向に飛ばす（user は flipped=true なので視覚的に右上になる）
const STAR_ITEMS = [
  { dx: -28, dy: -88, delay: "0s",    fs: 22, char: "✦", color: "#FFD700" },
  { dx: -58, dy: -70, delay: "0.04s", fs: 18, char: "★", color: "#FFE066" },
  { dx: -80, dy: -38, delay: "0.02s", fs: 15, char: "✧", color: "#FFB700" },
  { dx: -18, dy:-100, delay: "0.07s", fs: 20, char: "✦", color: "#FFF0A0" },
  { dx: -65, dy: -82, delay: "0.05s", fs: 22, char: "✦", color: "#FFD700" },
  { dx: -92, dy: -22, delay: "0.09s", fs: 14, char: "✧", color: "#FFD700" },
  { dx: -44, dy: -95, delay: "0.03s", fs: 16, char: "★", color: "#FFB6C1" },
  { dx: -12, dy: -75, delay: "0.06s", fs: 13, char: "✦", color: "#FFE135" },
  { dx: -72, dy: -58, delay: "0.01s", fs: 19, char: "✺", color: "#FFD700" },
  { dx: -38, dy: -60, delay: "0.08s", fs: 12, char: "✧", color: "#FFF0A0" },
];

export default function PetSprite({ images, emotion, triggerKey, size = 150, noAnimate = false, flipped = false }: Props & { triggerKey?: number }) {
  const [entered, setEntered] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const prevSrc = useRef<string | null>(null);
  const prevEmotion = useRef<Emotion>(emotion);
  const prevTriggerKey = useRef<number | undefined>(undefined);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 400);
    return () => clearTimeout(t);
  }, []);

  // emotion変化 or 外部triggerKey変化でアニメーション再マウント（CSS再生保証）
  useEffect(() => {
    const emotionChanged = emotion !== prevEmotion.current;
    const triggered = triggerKey !== undefined && triggerKey !== prevTriggerKey.current;
    prevEmotion.current = emotion;
    prevTriggerKey.current = triggerKey;
    if ((emotionChanged || triggered) && emotion !== "idle") setAnimKey(k => k + 1);
  }, [emotion, triggerKey]);

  const src = (emotion === "excited" ? images.happy : images[emotion]) ?? images.idle ?? null;

  useEffect(() => {
    if (!src || src === prevSrc.current) return;
    const isFirstLoad = prevSrc.current === null;
    prevSrc.current = src;
    // 生成画像（data URL）はAPI側で透明背景済み → removeBg不要
    if (src.startsWith("data:")) { setDisplaySrc(src); return; }
    const cacheKey = `${src}@v${BG_CACHE_VERSION}`;
    // 初回ロードのみ null にする（2回目以降は前の画像を保持してフラッシュを防ぐ）
    if (isFirstLoad && !bgCache.has(cacheKey)) setDisplaySrc(null);
    removeBg(src).then(setDisplaySrc);
  }, [src]);

  if (!displaySrc) return <div style={{ width: size, height: size * 1.2 }} />;

  const isExcited = emotion === "excited";
  const animStyle: React.CSSProperties = noAnimate
    ? isExcited ? { animation: "psShakeUser 0.35s ease-in-out 1" } : {}
    : isExcited
      ? { animation: "psExcitedPet 0.65s ease-in-out 1" }
      : (entered ? ANIM[emotion] : ENTRY);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position: "relative", display: "inline-block", ...(flipped ? { transform: "scaleX(-1)" } : {}) }}>
        <div key={animKey} className="ps-root" style={animStyle}>
          <img src={displaySrc} alt="pet" style={{ width: size, height: "auto" }} />
        </div>
        {isExcited && (
          <div key={`sb-${animKey}`} style={{ position: "absolute", left: "25%", top: "10%", width: 0, height: 0, pointerEvents: "none" }}>
            {STAR_ITEMS.map((s, i) => (
              <div key={i} style={{
                position: "absolute", left: 0, top: 0,
                fontSize: s.fs, color: s.color, lineHeight: 1,
                animationName: "psStarBurst",
                animationDuration: "0.85s",
                animationDelay: s.delay,
                animationTimingFunction: "ease-out",
                animationFillMode: "forwards",
                "--star-dx": `${s.dx}px`,
                "--star-dy": `${s.dy}px`,
              } as React.CSSProperties}>{s.char}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
