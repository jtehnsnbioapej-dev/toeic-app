"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PetSprite from "@/components/PetSprite";
import {
  CharacterRole,
  CharacterStock,
  getStocks,
  setActivePet,
  setActiveUser,
  removeStock,
  renameStock,
  resolveImages,
} from "@/lib/characterStorage";

type Tab = "pet" | "user";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("pet");
  const [stocks, setStocks] = useState(() => getStocks());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const refresh = useCallback(() => setStocks(getStocks()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const handleSelect = (id: string, role: CharacterRole) => {
    if (editingId) return; // 編集中は選択しない
    if (role === "pet") setActivePet(id);
    else setActiveUser(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm("このキャラクターを削除しますか？")) return;
    removeStock(id);
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

  const currentList = tab === "pet" ? stocks.pets : stocks.users;
  const activeId = tab === "pet" ? stocks.activePetId : stocks.activeUserId;

  return (
    <div className="min-h-screen pb-28" style={{ background: "var(--bg)" }}>
      {/* ヘッダー */}
      <div style={{
        background: "linear-gradient(180deg, #C9EEFF 0%, #EBF8FF 100%)",
        padding: "52px 20px 16px",
      }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--text-sub)", fontWeight: 700, textDecoration: "none" }}>
          ← ホーム
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginTop: 8 }}>⚙️ キャラクター設定</h1>
        <p style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2, fontWeight: 600 }}>
          使用するキャラクターを選択できます
        </p>
      </div>

      {/* タブ */}
      <div style={{ display: "flex", margin: "16px 20px 0", borderRadius: 14, overflow: "hidden", border: "1.5px solid #E5E7EB" }}>
        {(["pet", "user"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); cancelEdit(); }}
            style={{
              flex: 1, padding: "11px 0", fontSize: 13, fontWeight: 800,
              border: "none", cursor: "pointer",
              background: tab === t ? "var(--primary)" : "#fff",
              color: tab === t ? "#fff" : "var(--text-sub)",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {t === "pet" ? "🐾 ペット" : "👤 ユーザー"}
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
              onSelect={() => handleSelect(stock.id, tab)}
              onDelete={() => handleDelete(stock.id)}
              onEditStart={() => startEdit(stock)}
              onEditChange={setEditingName}
              onEditCommit={commitEdit}
              onEditCancel={cancelEdit}
            />
          ))}
        </div>

        {/* 追加ボタン（現在は無効） */}
        <button
          disabled
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, width: "100%", marginTop: 16,
            padding: "14px 0", borderRadius: 16,
            border: "2px dashed #E5E7EB",
            background: "#F8FAFC", color: "#CBD5E1",
            fontSize: 14, fontWeight: 700, cursor: "default",
          }}
        >
          ＋ 新しいキャラクターを追加（準備中）
        </button>
      </div>
    </div>
  );
}

function CharacterCard({
  stock,
  isActive,
  isEditing,
  editingName,
  onSelect,
  onDelete,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
}: {
  stock: CharacterStock;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onSelect: () => void;
  onDelete: () => void;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditCommit: () => void;
  onEditCancel: () => void;
}) {
  const images = resolveImages(stock.images);

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
      {/* 使用中バッジ */}
      {isActive && (
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "var(--primary)", color: "#fff",
          fontSize: 9, fontWeight: 800, borderRadius: 6, padding: "2px 6px",
        }}>
          使用中
        </div>
      )}

      {/* 削除ボタン（デフォルト以外） */}
      {!stock.isDefault && !isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: "absolute", top: 6, right: 6,
            width: 22, height: 22, borderRadius: "50%",
            background: "#FEE2E2", border: "none",
            color: "#EF4444", fontSize: 12, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800,
          }}
        >
          ×
        </button>
      )}

      {/* キャラクター画像（バッジ分の余白を確保・固定高さで名前行を揃える） */}
      <div style={{ marginTop: 20, height: 90, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <PetSprite images={images} emotion="idle" size={80} noAnimate />
      </div>

      {/* 名前（通常表示 or 編集中） */}
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
                flex: 1, padding: "4px 0", borderRadius: 7, fontSize: 11, fontWeight: 800,
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
            fontSize: 12, fontWeight: 800, color: "var(--text)",
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
