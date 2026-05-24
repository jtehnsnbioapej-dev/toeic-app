"use client";

import { useEffect, useState } from "react";
import PetSprite, { Emotion, PetImages } from "@/components/PetSprite";
import { DEFAULT_PET_IMAGES, getPetImages } from "@/lib/petImages";
import { getActiveUserImages, DEFAULT_USER_IMAGES } from "@/lib/characterStorage";
import SpeakButton from "@/components/SpeakButton";

type Props = {
  message: string;
  leftMessage?: string;
  leftChoices?: { label: string; value: string }[];
  onLeftChoice?: (value: string) => void;
  speakText?: string;
  speakAudioPath?: string;
  isLoading?: boolean;
  speaker?: "left" | "right";
  leftEmotion?: Emotion;
  petEffect?: "correct" | "wrong" | null;
  bg?: string;
};
type PetProfile = { name: string; emotions?: PetImages };

function inferEmotion(msg: string): Emotion {
  if (/パーフェクト|すごすぎ|全問正解|最高|めちゃくちゃ/.test(msg)) return "excited";
  if (/正解|さすが|いいね|覚えた|伸びてる|連続|習得|頑張って/.test(msg)) return "happy";
  if (/惜しい|不正解|大丈夫|間違|もう一度|難しい/.test(msg)) return "sad";
  return "idle";
}

const SCENE_CSS = `
  @keyframes sceneSlideLeft {
    from { transform: translateX(-60px); opacity: 0; }
    to   { transform: translateX(0);     opacity: 1; }
  }
  @keyframes sceneSlideRight {
    from { transform: translateX(60px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes bubblePop {
    from { transform: scale(0.85); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
  .scene-left  { animation: sceneSlideLeft  0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
  .scene-right { animation: sceneSlideRight 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
  .bubble-pop  { animation: bubblePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
  @keyframes psSparkle0 { 0%{transform:scale(0);opacity:1}70%{opacity:.9}100%{transform:translate(24px,-32px) scale(1.3);opacity:0} }
  @keyframes psSparkle1 { 0%{transform:scale(0);opacity:1}70%{opacity:.9}100%{transform:translate(-24px,-32px) scale(1.3);opacity:0} }
  @keyframes psSparkle2 { 0%{transform:scale(0);opacity:1}70%{opacity:.9}100%{transform:translate(36px,-8px) scale(1.3);opacity:0} }
  @keyframes psSparkle3 { 0%{transform:scale(0);opacity:1}70%{opacity:.9}100%{transform:translate(-36px,-8px) scale(1.3);opacity:0} }
  @keyframes psSparkle4 { 0%{transform:scale(0);opacity:1}70%{opacity:.9}100%{transform:translate(10px,-48px) scale(1.3);opacity:0} }
  @keyframes psSparkle5 { 0%{transform:scale(0);opacity:1}70%{opacity:.9}100%{transform:translate(-10px,-48px) scale(1.3);opacity:0} }
`;

const SPARKLES: Array<{ char: string; color: string; fontSize: number; top: string; right?: string; left?: string; delay: string }> = [
  { char: "✦", color: "#FFD700", fontSize: 14, top: "20%", right: "6%",  delay: "0s"    },
  { char: "✧", color: "#FFBB00", fontSize: 11, top: "16%", left: "6%",   delay: "0.07s" },
  { char: "★", color: "#FFC107", fontSize: 13, top: "43%", right: "1%",  delay: "0.13s" },
  { char: "✦", color: "#FFD700", fontSize: 10, top: "38%", left: "1%",   delay: "0.06s" },
  { char: "✧", color: "#FFBB00", fontSize: 12, top: "8%",  right: "20%", delay: "0.17s" },
  { char: "★", color: "#FFC107", fontSize: 11, top: "6%",  left: "20%",  delay: "0.10s" },
];

interface BubbleProps {
  message: string;
  side: "left" | "right";
  isLoading: boolean;
  speakText?: string;
  speakAudioPath?: string;
  top?: number;
}

function SpeechBubble({ message, side, isLoading, speakText, speakAudioPath, top = 80 }: BubbleProps) {
  const isRight = side === "right";
  return (
    <div
      key={message}
      className="bubble-pop"
      style={{
        position: "absolute",
        top,
        ...(isRight ? { right: 12 } : { left: 12 }),
        maxWidth: "44%",
        background: "#fff",
        borderRadius: "14px 14px 14px 14px",
        padding: "6px 10px 5px",
        border: "1px solid #D1D5DB",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        zIndex: 5,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
        <p style={{ fontSize: 11, color: "#1A2238", fontWeight: 700, margin: 0, lineHeight: 1.5, whiteSpace: "pre-line", flex: 1 }}>
          {isLoading ? "…" : message}
        </p>
        {!isLoading && speakText && (
          <SpeakButton text={speakText} audioPath={speakAudioPath} size={24} />
        )}
      </div>
      {/* 吹き出しのしっぽ */}
      <div style={{
        position: "absolute",
        bottom: -13,
        ...(isRight ? { right: 18 } : { left: 18 }),
        width: 0, height: 0,
        borderLeft: "10px solid transparent",
        borderRight: "10px solid transparent",
        borderTop: "13px solid #D1D5DB",
      }} />
      <div style={{
        position: "absolute",
        bottom: -10,
        ...(isRight ? { right: 18 } : { left: 18 }),
        width: 0, height: 0,
        borderLeft: "10px solid transparent",
        borderRight: "10px solid transparent",
        borderTop: "13px solid #fff",
      }} />
    </div>
  );
}

function ChoiceBubble({ choices, onChoice }: { choices: { label: string; value: string }[]; onChoice?: (v: string) => void }) {
  return (
    <div
      className="bubble-pop"
      style={{
        position: "absolute",
        top: 14,
        left: 12,
        maxWidth: "58%",
        background: "#fff",
        borderRadius: "16px 16px 16px 16px",
        padding: "8px 10px",
        border: "1px solid #D1D5DB",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      {choices.map((c) => (
        <button
          key={c.value}
          onClick={() => onChoice?.(c.value)}
          style={{
            background: "#EFF6FF", border: "1.5px solid #BFDBFE",
            borderRadius: 10, padding: "5px 10px",
            fontSize: 12, fontWeight: 700, color: "#1A2238",
            cursor: "pointer", textAlign: "left", whiteSpace: "nowrap",
          }}
        >
          {c.label}
        </button>
      ))}
      <div style={{
        position: "absolute", bottom: -13, left: 18,
        width: 0, height: 0,
        borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
        borderTop: "13px solid #D1D5DB",
      }} />
      <div style={{
        position: "absolute", bottom: -10, left: 18,
        width: 0, height: 0,
        borderLeft: "10px solid transparent", borderRight: "10px solid transparent",
        borderTop: "13px solid #fff",
      }} />
    </div>
  );
}

export default function PetScene({ message, leftMessage, leftChoices, onLeftChoice, speakText, speakAudioPath, isLoading = false, speaker, leftEmotion = "idle", petEffect, bg }: Props) {
  const [pet, setPet] = useState<PetProfile | null>(null);
  const [petImages, setPetImages] = useState<PetImages>(DEFAULT_PET_IMAGES);
  const [userImages, setUserImages] = useState<PetImages>(DEFAULT_USER_IMAGES);

  useEffect(() => {
    const saved = localStorage.getItem("petProfile");
    if (saved) setPet(JSON.parse(saved));
    setPetImages(getPetImages());
    setUserImages(getActiveUserImages());
  }, []);

  const emotion: Emotion = isLoading ? "think" : inferEmotion(message);

  return (
    <div style={{ overflow: "hidden" }}>
      <style>{SCENE_CSS}</style>

      <div style={{ position: "relative", height: 260 }}>
        {/* 背景 */}
        {bg ? (
          <img src={bg} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, #AEE0FF 0%, #D4EFFF 55%, #B8DDB8 55%, #9AC89A 100%)",
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 50,
              background: "linear-gradient(180deg, #88C488 0%, #6AAD6A 100%)",
              borderRadius: "50% 50% 0 0 / 16px 16px 0 0",
            }} />
            <div style={{
              position: "absolute", top: 16, right: 32,
              width: 32, height: 32, borderRadius: "50%",
              background: "radial-gradient(circle, #FFF9A0, #FFD700)",
              boxShadow: "0 0 18px #FFD70099",
            }} />
          </>
        )}

        {/* 吹き出し */}
        {leftMessage
          ? <SpeechBubble message={leftMessage} side="left" isLoading={false} top={14} />
          : leftChoices?.length
            ? <ChoiceBubble choices={leftChoices} onChoice={onLeftChoice} />
            : null
        }
        <SpeechBubble
          message={message}
          side="right"
          isLoading={isLoading}
          speakText={speakText}
          speakAudioPath={speakAudioPath}
          top={50}
        />

        {/* キャラクター */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          padding: "0 8px",
        }}>
          {/* 左：ユーザーキャラ */}
          <div
            className="scene-left"
            style={{
              filter: speaker === "left"
                ? "drop-shadow(0 0 8px rgba(56,178,240,0.5))"
                : "none",
              transition: "filter 0.3s ease",
            }}
          >
            <PetSprite
              images={userImages}
              emotion={leftEmotion}
              size={160}
              noAnimate
            />
          </div>

          {/* 右：ペット（感情アニメーション） */}
          <div style={{ position: "relative", marginBottom: "-16px" }}>
            <div
              className="scene-right"
              style={{
                filter: speaker === "right"
                  ? "drop-shadow(0 0 8px rgba(56,178,240,0.5))"
                  : "none",
                transition: "filter 0.3s ease",
              }}
            >
              <PetSprite
                images={petImages}
                emotion={emotion}
                size={138}
              />
            </div>

            {/* 正解エフェクト：キラキラ */}
            {petEffect === "correct" && SPARKLES.map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: s.top,
                  ...(s.right !== undefined ? { right: s.right } : { left: s.left }),
                  animation: `psSparkle${i} 0.7s ease-out ${s.delay} both`,
                  color: s.color,
                  fontSize: s.fontSize,
                  pointerEvents: "none",
                  lineHeight: 1,
                  zIndex: 3,
                }}
              >
                {s.char}
              </div>
            ))}

            {/* 不正解エフェクト：縦線（落ち込みライン・左上三角に限定）*/}
            {petEffect === "wrong" && (
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "repeating-linear-gradient(90deg, transparent 0, transparent 5px, rgba(80,100,190,0.32) 5px, rgba(80,100,190,0.32) 7px)",
                clipPath: "polygon(0 18%, 38% 18%, 0 38%)",
                pointerEvents: "none",
                zIndex: 2,
              }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
