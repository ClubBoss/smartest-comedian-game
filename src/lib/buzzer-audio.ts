const FREQUENCIES: Record<string, number> = {
  duck: 260,
  airhorn: 180,
  bell: 880,
  gong: 120,
  siren: 520,
  bike: 1040,
  kazoo: 420,
  whistle: 1320,
  horn: 320,
  buzzer: 150,
};

export async function playBuiltInCue(key: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const frequency = FREQUENCIES[key ?? ""] ?? 440;
  oscillator.type = key === "buzzer" || key === "airhorn" ? "sawtooth" : "sine";
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  if (key === "siren") {
    oscillator.frequency.linearRampToValueAtTime(frequency * 1.7, context.currentTime + 0.45);
  }
  gain.gain.setValueAtTime(0.18, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.55);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.55);
  oscillator.addEventListener("ended", () => void context.close(), { once: true });
}

export async function playWinnerCue(
  soundType: "builtin" | "custom" | null,
  soundKey: string | null,
  customUrl: string | null,
): Promise<void> {
  if (soundType === "custom" && customUrl) {
    const audio = new Audio(customUrl);
    await audio.play();
    return;
  }
  await playBuiltInCue(soundKey);
}
