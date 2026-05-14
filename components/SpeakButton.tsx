"use client";

import { useState } from "react";
import { playManagedAudio, stopCurrentAudio } from "@/lib/audioManager";

type Props = {
  text: string;
  size?: number;
  audioPath?: string;
};

export default function SpeakButton({ text, size = 32, audioPath }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (speaking) {
      stopCurrentAudio();
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }

    // 静的音声ファイルがある場合はそちらを再生
    if (audioPath) {
      setSpeaking(true);
      playManagedAudio(audioPath, () => setSpeaking(false), () => setSpeaking(false));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("TTS API error");

      const data = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);

      setSpeaking(true);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play();
    } catch {
      // フォールバック: ブラウザのWeb Speech API
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSpeak}
      title="読み上げる"
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        border: `1.5px solid ${speaking ? "#38B2F0" : "#D1E8F5"}`,
        background: speaking ? "#E8F6FE" : "#F7FBFE",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: loading ? "wait" : "pointer",
        flexShrink: 0,
        transition: "all 0.15s",
        padding: 0,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 20 20" fill="#38B2F0">
          <circle cx="10" cy="10" r="8" stroke="#38B2F0" strokeWidth="2" fill="none" strokeDasharray="30 10">
            <animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur="0.8s" repeatCount="indefinite"/>
          </circle>
        </svg>
      ) : speaking ? (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 20 20" fill="#38B2F0">
          <rect x="3" y="5" width="3" height="10" rx="1.5">
            <animate attributeName="height" values="10;4;10" dur="0.6s" repeatCount="indefinite"/>
            <animate attributeName="y" values="5;8;5" dur="0.6s" repeatCount="indefinite"/>
          </rect>
          <rect x="8.5" y="2" width="3" height="16" rx="1.5">
            <animate attributeName="height" values="16;6;16" dur="0.6s" begin="0.1s" repeatCount="indefinite"/>
            <animate attributeName="y" values="2;7;2" dur="0.6s" begin="0.1s" repeatCount="indefinite"/>
          </rect>
          <rect x="14" y="6" width="3" height="8" rx="1.5">
            <animate attributeName="height" values="8;3;8" dur="0.6s" begin="0.2s" repeatCount="indefinite"/>
            <animate attributeName="y" values="6;8.5;6" dur="0.6s" begin="0.2s" repeatCount="indefinite"/>
          </rect>
        </svg>
      ) : (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 20 20" fill="none" stroke="#38B2F0" strokeWidth="1.8">
          <path d="M5 8H3a1 1 0 00-1 1v2a1 1 0 001 1h2l4 3V5L5 8z" fill="#38B2F0" stroke="none"/>
          <path d="M14 7c1.1 1 1.8 2.4 1.8 4s-.7 3-1.8 4" strokeLinecap="round"/>
          <path d="M16.5 5c1.8 1.6 3 3.9 3 6.5s-1.2 4.9-3 6.5" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}
