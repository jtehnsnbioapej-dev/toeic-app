"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { generateIdleClient, generateEmotionClient } from "@/lib/generateCharacterClient";
import Link from "next/link";
import PetSprite from "@/components/PetSprite";
import { PetImages, Emotion } from "@/components/PetSprite";
import {
  CharacterRole,
  CharacterStock,
  getStocks,
  setActivePet,
  setActiveUser,
  removeStock,
  renameStock,
  toggleFlip,
  addStockWithStoredImages,
  resolveImages,
} from "@/lib/characterStorage";
import {
  hydrateImageCache,
  hydrateActiveImages,
  getCachedImage,
  saveCharacterImages,
  deleteCharacterImages,
} from "@/lib/imageDB";
import { Capacitor } from "@capacitor/core";
import {
  getTicketCount, purchaseTickets, consumeTicket, PRODUCT_CHARGEN,
} from "@/lib/purchases";

type Tab = "pet" | "user";
type GenState = "idle" | "selecting" | "generating" | "preview" | "error";
type Gender = "female" | "male";
type AgeGroup = "child" | "teen" | "young_adult" | "middle_aged" | "senior";

const AGE_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: "child",       label: "10歳以下" },
  { value: "teen",        label: "10代" },
  { value: "young_adult", label: "20〜30代" },
  { value: "middle_aged", label: "40〜50代" },
  { value: "senior",      label: "60代以上" },
];

async function compressImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas error")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png", 0.92));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}


const DISABLE_IMG_GEN = process.env.NEXT_PUBLIC_DISABLE_IMG_GEN === "true";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("pet");
  const [stocks, setStocks] = useState(getStocks);
  const [hydrating, setHydrating] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // キャラ生成フロー
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [genState, setGenState] = useState<GenState>("idle");
  const [generatedImages, setGeneratedImages] = useState<Partial<PetImages> | null>(null);
  const [charName, setCharName] = useState("");
  const [genError, setGenError] = useState("");
  const [genProgress, setGenProgress] = useState(0);
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender>("female");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup>("young_adult");
  const [previewFlipped, setPreviewFlipped] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [showNoTicket, setShowNoTicket] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const refresh = useCallback(() => setStocks(getStocks()), []);
  useEffect(() => {
    const all = getStocks();
    const activeIds = [all.activePetId, all.activeUserId].filter(Boolean);
    hydrateActiveImages(activeIds).then(() => {
      refresh();
      hydrateImageCache().then(() => {
        refresh();
        setHydrating(false);
      });
    });
  }, [refresh]);

  // チケット残数をマウント時に取得
  useEffect(() => {
    getTicketCount().then(setTicketCount);
  }, []);

  const handleSelect = (id: string, role: CharacterRole) => {
    if (editingId) return;
    if (role === "pet") setActivePet(id);
    else setActiveUser(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm("このキャラクターを削除しますか？")) return;
    const stock = [...stocks.pets, ...stocks.users].find(s => s.id === id);
    removeStock(id);
    if (stock?.hasStoredImages) deleteCharacterImages(id);
    refresh();
  };

  const startEdit = (stock: CharacterStock) => {
    setEditingId(stock.id);
    setEditingName(stock.name);
  };

  const commitEdit = () => {
    if (editingId && editingName.trim()) {
      renameStock(editingId, editingName.trim());
      refresh();
    }
    setEditingId(null);
    setEditingName("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleAddClick = async () => {
    if (genState === "generating") return;
    setGenState("idle");
    setGeneratedImages(null);
    setGenError("");
    if (Capacitor.isNativePlatform()) {
      const count = await getTicketCount();
      setTicketCount(count);
      if (count <= 0) {
        setShowNoTicket(true);
        return;
      }
    }
    fileInputRef.current?.click();
  };

  const handleBuyTicket = async () => {
    setIsBuying(true);
    const result = await purchaseTickets(PRODUCT_CHARGEN);
    setIsBuying(false);
    if (result.success) {
      const count = await getTicketCount();
      setTicketCount(count);
      setShowNoTicket(false);
      fileInputRef.current?.click();
    } else if (!result.cancelled) {
      // 購入失敗（キャンセルでない場合）はそのまま画面を維持
    } else {
      setShowNoTicket(false);
    }
  };

  const callGenerateAPI = async (base64: string, role: Tab, gender?: Gender, ageGroup?: AgeGroup) => {
    setGenState("generating");
    setGenProgress(0);
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "";
    const emotionKeys = role === "pet"
      ? (["happy", "sad"] as const)
      : (["happy", "sad", "think"] as const);

    try {
      // Step 1: idle生成 — クライアントからOpenAI直接呼び出し
      const { idle, idleRef } = await generateIdleClient(
        base64,
        role,
        gender ?? "female",
        ageGroup ?? "young_adult",
        apiKey
      );
      const images: Partial<PetImages> = {};
      images["idle"] = `data:image/png;base64,${idle}`;
      setGenProgress(1);

      // Step 2〜: 感情を1枚ずつ生成
      for (const emotion of emotionKeys) {
        const emotionB64 = await generateEmotionClient(idleRef, emotion, role, apiKey);
        images[emotion as Emotion] = `data:image/png;base64,${emotionB64}`;
        setGenProgress((p) => p + 1);
      }

      // 生成成功＝OpenAI APIコストが発生したので、ここでチケットを1枚消費する。
      // （保存するかどうかに関わらず消費。生成失敗時は catch に入りここを通らないため消費しない）
      if (Capacitor.isNativePlatform()) {
        const result = await consumeTicket();
        if (result.success) setTicketCount(result.remaining);
      }

      setGeneratedImages(images);
      setCharName(role === "pet" ? "マイペット" : "わたし");
      setPreviewFlipped(false);
      setGenState("preview");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
      setGenState("error");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const dataUrl = await compressImage(file, 1024);
    const base64 = dataUrl.split(",")[1];
    setPendingBase64(base64);
    setPendingPreview(dataUrl);
    if (tab === "user") {
      setSelectedGender("female");
      setSelectedAgeGroup("young_adult");
    }
    setGenState("selecting");
  };

  const handleGenerate = async () => {
    if (!pendingBase64) return;
    const base64 = pendingBase64;
    const role = tab;
    setPendingBase64(null);
    setPendingPreview(null);
    if (role === "user") {
      await callGenerateAPI(base64, "user", selectedGender, selectedAgeGroup);
    } else {
      await callGenerateAPI(base64, "pet");
    }
  };

  const handleSave = async () => {
    if (!generatedImages) return;
    try {
      // チケットは生成成功時（callGenerateAPI）に消費済みのため、保存時は消費しない
      // 仮のIDを生成してIndexedDBに先に保存
      const tempId = `${tab}-${Date.now()}`;
      const rawImages: Record<string, string> = {};
      for (const [k, v] of Object.entries(generatedImages)) {
        if (v) rawImages[k] = v;
      }
      await saveCharacterImages(tempId, rawImages);

      // メタデータのみlocalStorageに保存（画像は含まない）
      const saved = addStockWithStoredImages({
        name: charName.trim() || (tab === "pet" ? "マイペット" : "わたし"),
        role: tab,
        isDefault: false,
        flipped: previewFlipped,
      });

      // tempIdで保存した画像を正式IDで再保存
      await saveCharacterImages(saved.id, rawImages);
      await deleteCharacterImages(tempId);

      refresh();
      setGenState("idle");
      setGeneratedImages(null);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "保存に失敗しました");
      setGenState("error");
    }
  };

  const currentList = tab === "pet" ? stocks.pets : stocks.users;
  const activeId = tab === "pet" ? stocks.activePetId : stocks.activeUserId;

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      {/* ヘッダー */}
      <div style={{
        background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
        padding: "52px 20px 16px",
        position: "relative",
      }}>
        {!DISABLE_IMG_GEN && (
          <div style={{
            position: "absolute", top: 52, right: 20,
            display: "flex", alignItems: "center", gap: 6,
            background: "#fff", borderRadius: 999, padding: "7px 14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}>
            <span style={{ fontSize: 15 }}>🎫</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{ticketCount}</span>
          </div>
        )}
        <Link href="/" style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none" }}>
          ← ホーム
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginTop: 8 }}>🌟 キャラ</h1>
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2, fontWeight: 600 }}>
          使用するキャラクターを選択できます
        </p>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", margin: "16px 20px 0", borderRadius: 14, overflow: "hidden", border: "1.5px solid #E5E7EB" }}>
        {(["user", "pet"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); cancelEdit(); setGenState("idle"); setGeneratedImages(null); }}
            style={{
              flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: tab === t ? "var(--primary)" : "#fff",
              color: tab === t ? "#fff" : "var(--text-sub)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {t === "pet" ? "🐾 おともだち" : "👤 あなた"}
          </button>
        ))}
      </div>

      {/* キャラクターグリッド */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {currentList.map((stock) => (
            <CharacterCard
              key={stock.id}
              stock={stock}
              isActive={stock.id === activeId}
              isEditing={editingId === stock.id}
              editingName={editingName}
              isLoading={hydrating && !!stock.hasStoredImages && !getCachedImage(stock.id, "idle")}
              onSelect={() => handleSelect(stock.id, tab)}
              onDelete={() => handleDelete(stock.id)}
              onEditStart={() => startEdit(stock)}
              onEditChange={setEditingName}
              onEditCommit={commitEdit}
              onEditCancel={cancelEdit}
              onFlip={() => { toggleFlip(stock.id); refresh(); }}
            />
          ))}
        </div>

        {/* 隠しファイルインプット */}
        {!DISABLE_IMG_GEN && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        )}

        {/* 性別・年齢選択 */}
        {!DISABLE_IMG_GEN && genState === "selecting" && (
          <div style={{
            marginTop: 16, padding: "16px", borderRadius: 16,
            background: "#F0F9FF", border: "1.5px solid #BAE6FD",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0369A1", marginBottom: 14 }}>
              この写真でキャラクターを生成しますか？
            </p>

            {pendingPreview && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingPreview}
                  alt="選択した写真"
                  style={{
                    width: 96, height: 96, objectFit: "cover", borderRadius: 12,
                    border: "1.5px solid #BAE6FD",
                  }}
                />
              </div>
            )}

            {tab === "user" && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>性別</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {(["female", "male"] as Gender[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => setSelectedGender(v)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                        border: "1.5px solid",
                        borderColor: selectedGender === v ? "#0EA5E9" : "#E5E7EB",
                        background: selectedGender === v ? "#E0F2FE" : "#fff",
                        color: selectedGender === v ? "#0369A1" : "#6B7280",
                        cursor: "pointer",
                      }}
                    >
                      {v === "female" ? "女性" : "男性"}
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>年齢帯</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                  {AGE_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSelectedAgeGroup(value)}
                      style={{
                        padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, textAlign: "left",
                        border: "1.5px solid",
                        borderColor: selectedAgeGroup === value ? "#0EA5E9" : "#E5E7EB",
                        background: selectedAgeGroup === value ? "#E0F2FE" : "#fff",
                        color: selectedAgeGroup === value ? "#0369A1" : "#374151",
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5, marginBottom: 14 }}>
              ※AIによる生成のため、写真を忠実に再現するものではありません。雰囲気を元にしたイラストが作られます。
            </p>

            <button
              onClick={handleGenerate}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: "#0EA5E9", color: "#fff", border: "none", cursor: "pointer", marginBottom: 8,
              }}
            >
              生成する
            </button>
            <button
              onClick={() => { setGenState("idle"); setPendingBase64(null); setPendingPreview(null); }}
              style={{
                width: "100%", padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "#F3F4F6", color: "#6B7280", border: "none", cursor: "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        )}

        {/* 生成中 */}
        {!DISABLE_IMG_GEN && genState === "generating" && (
          <div style={{
            marginTop: 16, padding: "20px 16px", borderRadius: 16,
            background: "#EFF6FF", border: "1.5px solid #BFDBFE",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <div style={{ fontSize: 26 }}>✨</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1E40AF" }}>AIがキャラを生成中... {genProgress}/{tab === "pet" ? 3 : 4}</p>
            <div style={{ width: "100%", height: 8, background: "#BFDBFE", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${(genProgress / (tab === "pet" ? 3 : 4)) * 100}%`, height: "100%", background: "#3B82F6", borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <p style={{ fontSize: 12, color: "#3B82F6" }}>1枚ずつ生成しています（全{tab === "pet" ? 3 : 4}枚）</p>
            <p style={{ fontSize: 11, color: "#1E40AF", fontWeight: 700, textAlign: "center", lineHeight: 1.5, marginTop: 2 }}>
              完了までこの画面のままお待ちください。<br />他の画面に移動すると生成が中断されます。
            </p>
          </div>
        )}

        {/* プレビュー */}
        {!DISABLE_IMG_GEN && genState === "preview" && generatedImages && (
          <div style={{
            marginTop: 16, padding: "16px", borderRadius: 16,
            background: "#F0FDF4", border: "1.5px solid #BBF7D0",
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 10 }}>
              生成完了！確認してください
            </p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, justifyContent: "center" }}>
              {(tab === "pet"
                ? (["idle", "happy", "sad"] as Emotion[])
                : (["idle", "happy", "sad", "think"] as Emotion[])
              ).map((e) => (
                <div key={e} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 10, overflow: "hidden",
                    background: "#fff", border: "1.5px solid #D1FAE5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PetSprite images={resolveImages(generatedImages)} emotion={e} size={46} noAnimate flipped={previewFlipped} />
                  </div>
                  <span style={{ fontSize: 9, color: "#6B7280", fontWeight: 600 }}>
                    {e === "idle" ? "通常" : e === "happy" ? "喜び" : e === "sad" ? "悲しみ" : e === "think" ? "考え中" : "興奮"}
                  </span>
                </div>
              ))}
            </div>
            {/* 反転ボタン */}
            <button
              onClick={() => setPreviewFlipped((f) => !f)}
              style={{
                width: "100%", padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: previewFlipped ? "#EDE9FE" : "#F3F4F6",
                color: previewFlipped ? "#7C3AED" : "#6B7280",
                border: previewFlipped ? "1.5px solid #DDD6FE" : "1.5px solid #E5E7EB",
                cursor: "pointer", marginBottom: 10,
              }}
            >
              ⇄ 左右反転{previewFlipped ? "（反転中）" : ""}
            </button>
            <input
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              placeholder="キャラクター名"
              style={{
                width: "100%", border: "1.5px solid #6EE7B7", borderRadius: 8,
                padding: "7px 10px", fontSize: 13, fontWeight: 700,
                outline: "none", boxSizing: "border-box", marginBottom: 8,
              }}
            />
            <button
              onClick={handleSave}
              style={{
                width: "100%", padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: "#16A34A", color: "#fff", border: "none", cursor: "pointer", marginBottom: 6,
              }}
            >
              このキャラを使う
            </button>
            <button
              onClick={() => { setGenState("idle"); setGeneratedImages(null); }}
              style={{
                width: "100%", padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "#F3F4F6", color: "#6B7280", border: "none", cursor: "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        )}

        {/* エラー */}
        {!DISABLE_IMG_GEN && genState === "error" && (
          <div style={{
            marginTop: 16, padding: "16px", borderRadius: 16,
            background: "#FEF2F2", border: "1.5px solid #FECACA",
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>生成に失敗しました</p>
            <p style={{ fontSize: 11, color: "#B91C1C", marginBottom: 12, wordBreak: "break-all" }}>{genError}</p>
            <button
              onClick={() => setGenState("idle")}
              style={{
                padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "#EF4444", color: "#fff", border: "none", cursor: "pointer",
              }}
            >
              閉じる
            </button>
          </div>
        )}

        {/* チケットなし */}
        {!DISABLE_IMG_GEN && showNoTicket && (
          <div style={{
            marginTop: 16, padding: "16px", borderRadius: 16,
            background: "#FFFBEB", border: "1.5px solid #FDE68A",
          }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>
              🎟️ チケットが0枚です
            </p>
            <p style={{ fontSize: 12, color: "#B45309", marginBottom: 14 }}>
              キャラクター生成には1枚必要です
            </p>
            <button
              onClick={handleBuyTicket}
              disabled={isBuying}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: "#F59E0B", color: "#fff", border: "none",
                cursor: isBuying ? "not-allowed" : "pointer",
                opacity: isBuying ? 0.7 : 1, marginBottom: 8,
              }}
            >
              {isBuying ? "処理中..." : "チケットを購入する（¥200）"}
            </button>
            <button
              onClick={() => setShowNoTicket(false)}
              style={{
                width: "100%", padding: "7px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "#F3F4F6", color: "#6B7280", border: "none", cursor: "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        )}

        {/* 追加ボタン */}
        {!DISABLE_IMG_GEN && (genState === "idle" || genState === "error") && !showNoTicket && (
          <button
            onClick={handleAddClick}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, width: "100%", marginTop: 16,
              padding: "14px 0", borderRadius: 16,
              border: "2px dashed #93C5FD",
              background: "#EFF6FF", color: "#2563EB",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            ＋ 写真からキャラクターを生成
          </button>
        )}
      </div>

    </div>
  );
}

function CharacterCard({
  stock,
  isActive,
  isEditing,
  editingName,
  isLoading,
  onSelect,
  onDelete,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onFlip,
}: {
  stock: CharacterStock;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  isLoading: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
  onFlip: () => void;
}) {
  const images = resolveImages(stock.images, stock.hasStoredImages ? stock.id : undefined);

  return (
    <div
      onClick={!isEditing ? onSelect : undefined}
      style={{
        background: "#fff",
        borderRadius: 18,
        padding: "12px 10px",
        border: "2.5px solid",
        borderColor: isActive ? "var(--primary)" : "#E5E7EB",
        boxShadow: isActive ? "0 0 0 3px rgba(56,178,240,0.15)" : "0 2px 8px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        position: "relative",
        cursor: isEditing ? "default" : "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {isActive && (
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "var(--primary)", color: "#fff",
          fontSize: 9, fontWeight: 700, borderRadius: 6, padding: "2px 6px",
        }}>
          使用中
        </div>
      )}

      {!stock.isDefault && !isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute", top: 6, right: 6,
            width: 22, height: 22, borderRadius: "50%",
            background: "#FEE2E2", border: "none",
            color: "#EF4444", fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700,
          }}
        >
          ×
        </button>
      )}

      <div style={{ marginTop: 20, height: 90, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        {isLoading ? (
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%)",
            backgroundSize: "200% 200%",
            animation: "shimmer 1.2s infinite",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, color: "#9CA3AF",
          }}>
            🖼
          </div>
        ) : (
          <PetSprite images={images} emotion="idle" size={80} noAnimate flipped={stock.flipped} />
        )}
      </div>
      {!stock.isDefault && !isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onFlip(); }}
          style={{
            padding: "3px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700,
            background: stock.flipped ? "#EDE9FE" : "#F3F4F6",
            color: stock.flipped ? "#7C3AED" : "#9CA3AF",
            border: stock.flipped ? "1px solid #DDD6FE" : "1px solid #E5E7EB",
            cursor: "pointer",
          }}
        >
          ⇄ 反転
        </button>
      )}

      {isEditing ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5 }}
        >
          <input
            autoFocus
            value={editingName}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEditCommit();
              if (e.key === "Escape") onEditCancel();
            }}
            style={{
              width: "100%", border: "1.5px solid var(--primary)", borderRadius: 8,
              padding: "5px 8px", fontSize: 12, fontWeight: 700,
              textAlign: "center", outline: "none", boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEditCommit(); }}
              style={{
                flex: 1, padding: "4px 0", borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer",
              }}
            >
              保存
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEditCancel(); }}
              style={{
                flex: 1, padding: "4px 0", borderRadius: 7, fontSize: 11, fontWeight: 700,
                background: "#F3F4F6", color: "#6B7280", border: "none", cursor: "pointer",
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", minHeight: 20 }}>
          <p style={{
            fontSize: 12, fontWeight: 700, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.4,
          }}>
            {stock.name}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onEditStart(); }}
            style={{
              flexShrink: 0, background: "none", border: "none",
              fontSize: 11, cursor: "pointer", color: "#9CA3AF", padding: "0 2px",
              lineHeight: 1, display: "flex", alignItems: "center",
            }}
          >
            ✏️
          </button>
        </div>
      )}
    </div>
  );
}
