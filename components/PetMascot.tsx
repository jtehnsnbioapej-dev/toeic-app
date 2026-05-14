"use client";

import { useEffect, useState } from "react";
import PetSprite, { Emotion, PetImages } from "@/components/PetSprite";
import { DEFAULT_PET_IMAGES } from "@/lib/petImages";

type Props = { message: string; isLoading?: boolean };
type PetProfile = { name: string; emotions?: PetImages };

function inferEmotion(msg: string): Emotion {
  if (/パーフェクト|すごすぎ|全問正解|最高|めちゃくちゃ/.test(msg)) return "excited";
  if (/正解|さすが|いいね|覚えた|伸びてる|連続|習得|頑張って/.test(msg)) return "happy";
  if (/惜しい|不正解|大丈夫|間違|もう一度|難しい/.test(msg)) return "sad";
  return "idle";
}

export default function PetMascot({ message, isLoading = false }: Props) {
  const [pet, setPet] = useState<PetProfile | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("petProfile");
    if (saved) setPet(JSON.parse(saved));
  }, []);

  const emotion: Emotion = isLoading ? "think" : inferEmotion(message);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "4px 16px" }}>
      <PetSprite images={pet?.emotions ?? DEFAULT_PET_IMAGES} emotion={emotion} size={110} />
      <div style={{
        background: "#fff",
        border: "1.5px solid #E5E7EB",
        borderRadius: "18px 18px 18px 4px",
        padding: "12px 16px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
        maxWidth: 220, marginBottom: 16,
      }}>
        {isLoading
          ? <p style={{ fontSize: 13, color: "#9CA3AF" }}>考え中…</p>
          : <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.65 }}>{message}</p>
        }
        {pet?.name && (
          <span style={{ fontSize: 11, color: "#A78BFA", marginTop: 4, display: "block" }}>
            {pet.name}
          </span>
        )}
      </div>
    </div>
  );
}
