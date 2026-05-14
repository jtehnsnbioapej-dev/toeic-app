let currentAudio: HTMLAudioElement | null = null;

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
