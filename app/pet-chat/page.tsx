"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import PetSprite from "@/components/PetSprite";
import { DEFAULT_PET_IMAGES } from "@/lib/petImages";
import { Emotion, PetImages } from "@/components/PetSprite";

type Message = { role: "user" | "assistant"; content: string };

const EMOTIONS: Emotion[] = ["idle", "happy", "sad", "think", "excited"];
const EMOTION_LABELS: Record<Emotion, string> = {
  idle: "通常",
  happy: "うれしい",
  sad: "かなしい",
  think: "かんがえ中",
  excited: "こうふん",
};

export default function PetChatPage() {
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("猫");
  const [isSetupDone, setIsSetupDone] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // AI画像生成用
  const [uploadedPhoto, setUploadedPhoto] = useState<{ base64: string; mediaType: string; previewUrl: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0); // 0-5
  const [generatedImages, setGeneratedImages] = useState<PetImages | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("petProfile");
    if (saved) {
      const profile = JSON.parse(saved);
      setPetName(profile.name);
      setPetType(profile.type ?? "猫");
      setIsSetupDone(true);
      const savedMessages = localStorage.getItem("petChatLog");
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      } else {
        setMessages([{ role: "assistant", content: `${profile.name}だよ！今日も一緒にTOEIC頑張ろうね！` }]);
      }
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0) {
      localStorage.setItem("petChatLog", JSON.stringify(messages));
    }
  }, [messages]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(",");
      const mediaType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
      setUploadedPhoto({ base64, mediaType, previewUrl: dataUrl });
      setGeneratedImages(null);
    };
    reader.readAsDataURL(file);
  };

  const compressImage = (dataUrl: string, maxPx = 300): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const handleGenerateImages = async () => {
    if (!uploadedPhoto) return;
    setIsGenerating(true);
    setGenProgress(0);

    // 送信前に写真を512pxまで縮小してボディサイズを削減
    const smallDataUrl = await compressImage(
      `data:${uploadedPhoto.mediaType};base64,${uploadedPhoto.base64}`,
      512
    );
    const [smallHeader, smallBase64] = smallDataUrl.split(",");
    const smallMediaType = smallHeader.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";

    // ベースキャラクター1枚を生成。感情表現はCSSアニメーションで対応
    let baseImage: string | undefined;
    try {
      const res = await fetch("/api/generate-pet-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: smallBase64,
          mediaType: smallMediaType,
          animalType: petType,
        }),
      });
      const data = await res.json();
      if (data.imageBase64) {
        baseImage = await compressImage(`data:${data.mimeType};base64,${data.imageBase64}`);
      }
    } catch {
      // fall through to default
    }
    setGenProgress(1);

    // idleキーのみ保存（PetSpriteは images[emotion] ?? images.idle でフォールバックする）
    const result: PetImages = baseImage ? { idle: baseImage } : DEFAULT_PET_IMAGES;

    setGeneratedImages(result);
    setIsGenerating(false);
  };

  const handleSetup = () => {
    if (!petName.trim()) return;
    // 生成済みだが全てundefined（空オブジェクト）の場合はデフォルトにフォールバック
    const hasValidEmotions = generatedImages && Object.values(generatedImages).some(Boolean);
    const emotions = hasValidEmotions ? generatedImages! : DEFAULT_PET_IMAGES;
    const profile = { name: petName, type: petType, emotions };
    try {
      localStorage.setItem("petProfile", JSON.stringify(profile));
    } catch {
      // localStorage容量超過時はemotionsなしで保存
      localStorage.setItem("petProfile", JSON.stringify({ name: petName, type: petType, emotions: DEFAULT_PET_IMAGES }));
    }
    setIsSetupDone(true);
    setMessages([{ role: "assistant", content: `${petName}だよ！よろしくね！一緒にTOEIC頑張ろう！` }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/pet-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, petName, petType }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "ごめんね、もう一度言って？" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePet = () => {
    localStorage.removeItem("petProfile");
    setIsSetupDone(false);
    setPetName("");
    setPetType("猫");
  };

  const handleResetAll = () => {
    localStorage.removeItem("petProfile");
    localStorage.removeItem("petChatLog");
    setIsSetupDone(false);
    setShowResetConfirm(false);
    setPetName("");
    setPetType("猫");
    setUploadedPhoto(null);
    setGeneratedImages(null);
    setMessages([]);
  };

  // ── 登録画面 ──────────────────────────────────────────
  if (!isSetupDone) {
    return (
      <div className="min-h-screen pb-24" style={{ background: "var(--bg)" }}>
        <div style={{
          background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
          padding: "52px 20px 24px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link href="/" style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none" }}>
              ← ホームへ
            </Link>
            <button
              onClick={handleResetAll}
              style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", background: "#FEE2E2", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}
            >
              🗑️ データリセット
            </button>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginTop: 8 }}>🐾 ペット設定</h1>
          <p style={{ fontSize: 13, color: "var(--text-sub)", marginTop: 4, fontWeight: 600 }}>
            名前を入力するだけで始められます
          </p>
        </div>

        {/* ペットプレビュー */}
        <div style={{ display: "flex", justifyContent: "center", padding: "24px 0 8px" }}>
          <PetSprite images={DEFAULT_PET_IMAGES} emotion="idle" size={180} />
        </div>

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 名前入力 */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)", marginBottom: 10 }}>✏️ ペットの名前</p>
            <input
              type="text"
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetup()}
              placeholder="例: ミケ、ポチ、モカ"
              style={{
                width: "100%", border: "1.5px solid #E5E7EB", borderRadius: 14,
                padding: "12px 16px", fontSize: 16, outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 種類選択 */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)", marginBottom: 10 }}>🐶 ペットの種類</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {["犬", "猫", "うさぎ", "ハムスター", "鳥", "その他"].map((type) => (
                <button
                  key={type}
                  onClick={() => setPetType(type)}
                  style={{
                    padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                    border: "2px solid",
                    borderColor: petType === type ? "var(--primary)" : "#E5E7EB",
                    background: petType === type ? "#EBF8FF" : "#fff",
                    color: petType === type ? "var(--primary)" : "var(--text-sub)",
                    cursor: "pointer",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* AI画像生成 */}
          <div style={{ background: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-sub)", marginBottom: 4 }}>
              ✨ AI画像生成（オプション）
            </p>
            <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 12 }}>
              ペットの写真からベースキャラクターを生成します（感情はアニメで表現）
            </p>

            {/* 写真アップロード */}
            <label style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              border: "2px dashed #CBD5E1", borderRadius: 14, padding: "14px 0",
              cursor: "pointer", color: "#64748B", fontSize: 13, fontWeight: 700,
              background: uploadedPhoto ? "#F8FAFC" : "#fff",
            }}>
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
              {uploadedPhoto ? "📷 写真を変更する" : "📷 写真を選ぶ"}
            </label>

            {/* プレビュー */}
            {uploadedPhoto && (
              <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <img
                  src={uploadedPhoto.previewUrl}
                  alt="uploaded"
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  {!generatedImages && !isGenerating && (
                    <button
                      onClick={handleGenerateImages}
                      style={{
                        background: "linear-gradient(135deg, #A78BFA, #7C3AED)",
                        color: "#fff", borderRadius: 12, padding: "10px 16px",
                        fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(124,58,237,0.3)", width: "100%",
                      }}
                    >
                      🤖 AI画像を生成する
                    </button>
                  )}
                  {isGenerating && (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#7C3AED", marginBottom: 8 }}>
                        生成中…
                      </p>
                      <div style={{ background: "#EDE9FE", borderRadius: 8, height: 8, overflow: "hidden" }}>
                        <div style={{
                          background: "linear-gradient(90deg, #A78BFA, #7C3AED)",
                          height: "100%", borderRadius: 8,
                          width: genProgress >= 1 ? "100%" : "10%",
                          transition: "width 0.3s ease",
                        }} />
                      </div>
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                        {genProgress < 1 ? "ベースキャラクターを生成中..." : "完了！"}
                      </p>
                    </div>
                  )}
                  {generatedImages && !isGenerating && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#10B981" }}>✅ 生成完了！</p>
                  )}
                </div>
              </div>
            )}

            {/* 生成画像プレビュー */}
            {generatedImages && (
              <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
                <img
                  src={generatedImages.idle ?? DEFAULT_PET_IMAGES.idle}
                  alt="generated"
                  style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 12, background: "#F0FDF4" }}
                />
                <p style={{ fontSize: 12, color: "#6B7280" }}>感情はアニメーションで表現されます</p>
              </div>
            )}
          </div>

          <button
            onClick={handleSetup}
            disabled={!petName.trim() || isGenerating}
            style={{
              background: petName.trim() && !isGenerating
                ? "linear-gradient(135deg, #38B2F0, #1A90D4)"
                : "#E5E7EB",
              color: petName.trim() && !isGenerating ? "#fff" : "#9CA3AF",
              borderRadius: 18, padding: "17px 0",
              fontWeight: 700, fontSize: 17, border: "none",
              cursor: petName.trim() && !isGenerating ? "pointer" : "default",
              boxShadow: petName.trim() && !isGenerating ? "0 6px 20px rgba(56,178,240,0.4)" : "none",
            }}
          >
            {petName.trim() ? `${petName}と話す！🐾` : "名前を入力してください"}
          </button>
        </div>
      </div>
    );
  }

  // ── チャット画面 ──────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F8FAFC" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
        padding: "52px 20px 12px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none", marginRight: 4 }}>←</Link>
        <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", background: "rgba(56,178,240,0.15)", flexShrink: 0 }}>
          <img src={DEFAULT_PET_IMAGES.idle} alt={petName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{petName}</p>
          <p style={{ fontSize: 11, color: "var(--text-sub)", fontWeight: 600 }}>{petType}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleChangePet} style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", background: "rgba(56,178,240,0.12)", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>🔄 変更</button>
          {showResetConfirm ? (
            <>
              <button onClick={handleResetAll} style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: "#EF4444", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>削除する</button>
              <button onClick={() => setShowResetConfirm(false)} style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", background: "#F3F4F6", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer" }}>×</button>
            </>
          ) : (
            <button onClick={() => setShowResetConfirm(true)} style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", background: "#FEE2E2", border: "none", borderRadius: 10, padding: "6px 12px", cursor: "pointer" }}>🗑️ リセット</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end", gap: 8, marginBottom: 12,
          }}>
            {msg.role === "assistant" && (
              <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "rgba(56,178,240,0.15)" }}>
                <img src={DEFAULT_PET_IMAGES.idle} alt={petName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
            <div style={{
              maxWidth: "75%", padding: "12px 16px", borderRadius: "18px",
              borderBottomRightRadius: msg.role === "user" ? 4 : 18,
              borderBottomLeftRadius: msg.role === "assistant" ? 4 : 18,
              background: msg.role === "user" ? "linear-gradient(135deg, #38B2F0, #1A90D4)" : "#fff",
              color: msg.role === "user" ? "#fff" : "var(--text)",
              fontSize: 14, lineHeight: 1.65, fontWeight: 600,
              boxShadow: msg.role === "assistant" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "rgba(56,178,240,0.15)" }}>
              <img src={DEFAULT_PET_IMAGES.idle} alt={petName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ background: "#fff", padding: "12px 16px", borderRadius: "18px 18px 18px 4px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>考え中…</p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "12px 16px 28px", background: "#fff",
        borderTop: "1.5px solid #F3F4F6",
        display: "flex", gap: 10, alignItems: "center",
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="英語か日本語で話しかけて！"
          style={{
            flex: 1, border: "1.5px solid #E5E7EB", borderRadius: 14,
            padding: "12px 16px", fontSize: 14, outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          style={{
            width: 48, height: 48, borderRadius: 14, border: "none",
            background: input.trim() && !isLoading ? "linear-gradient(135deg, #38B2F0, #1A90D4)" : "#E5E7EB",
            color: input.trim() && !isLoading ? "#fff" : "#9CA3AF",
            fontSize: 20, cursor: input.trim() && !isLoading ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
