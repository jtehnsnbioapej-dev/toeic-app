import { registerPlugin, Capacitor } from '@capacitor/core';

interface _IAPPlugin { playSfx(o: { name: string }): Promise<void>; }
const _IAP = registerPlugin<_IAPPlugin>('IAP');

let currentAudio: HTMLAudioElement | null = null;

// ── 効果音 ON/OFF ──────────────────────────────────────
const SFX_KEY = "sfxEnabled";

export function getSfxEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(SFX_KEY);
  return v === null ? true : v === "true";
}

export function setSfxEnabled(enabled: boolean): void {
  localStorage.setItem(SFX_KEY, String(enabled));
}

export function playSfx(src: string): void {
  if (!getSfxEnabled()) return;
  if (Capacitor.isNativePlatform()) {
    const name = src.split('/').pop()?.replace('.mp3', '') ?? '';
    _IAP.playSfx({ name }).catch(() => {});
  } else {
    new Audio(src).play().catch(() => {});
  }
}

export function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

export function playManagedAudio(
  src: string,
  onEnd: () => void,
  onError: () => void
) {
  stopCurrentAudio();
  const audio = new Audio(src);
  currentAudio = audio;
  audio.onended = () => { currentAudio = null; onEnd(); };
  audio.onerror = () => { currentAudio = null; onError(); };
  audio.play().catch(() => { currentAudio = null; onError(); });
}
