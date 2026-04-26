"use client";

import React, { useEffect, useRef, useState } from "react";

// 背景除去（緑・マゼンタの単色背景を透明化）
const BG_CACHE_VERSION = 5;
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
        // 32段階に量子化して最頻出の色グループを背景色とする
        const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();
        for (const pos of edgeSamples) {
          const i = pos * 4;
          const qr = Math.round(d[i] / 32) * 32;
          const qg = Math.round(d[i+1] / 32) * 32;
          const qb = Math.round(d[i+2] / 32) * 32;
          const key = `${qr},${qg},${qb}`;
          const cur = colorBuckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
          colorBuckets.set(key, { count: cur.count + 1, r: d[i], g: d[i+1], b: d[i+2] });
        }
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

export type Emotion = "idle" | "happy" | "sad" | "think" | "surprise";
export type PetImages = Partial<Record<Emotion, string>>;

const EMOTION_BADGE: Partial<Record<Emotion, string>> = {
  happy: "😊",
  sad: "😢",
  think: "🤔",
  surprise: "😲",
};

interface Props {
  images: PetImages;
  emotion: Emotion;
  size?: number;
  noAnimate?: boolean;
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
`;

const ENTRY: React.CSSProperties = {
  animation: "psSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
};

const ANIM: Record<Emotion, React.CSSProperties> = {
  idle:     {},
  happy:    { animation: "psBounce 0.6s ease-in-out 1" },
  sad:      { animation: "psWobble 0.7s ease-in-out 1", filter: "brightness(0.85) saturate(0.7)" },
  think:    { animation: "psTilt 2.2s ease-in-out 1" },
  surprise: { animation: "psPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both" },
};

export default function PetSprite({ images, emotion, size = 150, noAnimate = false }: Props) {
  const [entered, setEntered] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const prevSrc = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 400);
    return () => clearTimeout(t);
  }, []);

  const src = images[emotion] ?? images.idle ?? null;

  useEffect(() => {
    if (!src || src === prevSrc.current) return;
    prevSrc.current = src;
    removeBg(src).then(setDisplaySrc);
  }, [src]);

  if (!displaySrc) return <div style={{ width: size, height: size * 1.2 }} />;
  return (
    <>
      <style>{CSS}</style>
      <div className="ps-root" style={noAnimate ? {} : (entered ? ANIM[emotion] : ENTRY)}>
        <img src={displaySrc} alt="pet" style={{ width: size, height: "auto" }} />
      </div>
    </>
  );
}
