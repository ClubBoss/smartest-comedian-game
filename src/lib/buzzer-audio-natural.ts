import {
  armBuzzerAudio as armFallbackAudio,
  playBuiltInCue as playFallbackBuiltInCue,
  playWinnerCue as playFallbackWinnerCue,
} from "./buzzer-audio";

type NaturalCue = {
  url: string;
  volume: number;
  durationMs: number;
};

// These cover the built-ins that sounded most synthetic in the procedural
// fallback pack. The original Web Audio cues remain the offline/fetch fallback.
// Licensing and source links are recorded in docs/audio-sources.md.
const NATURAL_CUES: Partial<Record<string, NaturalCue>> = {
  whistle: {
    url: "https://upload.wikimedia.org/wikipedia/commons/4/4d/WWS_Policewhistle.ogg",
    volume: 0.72,
    durationMs: 1200,
  },
  horn: {
    url: "https://upload.wikimedia.org/wikipedia/commons/1/12/WWS_Signalhorn.ogg",
    volume: 0.78,
    durationMs: 1350,
  },
  buzzer: {
    url: "https://upload.wikimedia.org/wikipedia/commons/3/34/Buzzer.ogg",
    volume: 0.82,
    durationMs: 1050,
  },
  boing: {
    url: "https://upload.wikimedia.org/wikipedia/commons/e/ee/Boing_raw.ogg",
    volume: 0.78,
    durationMs: 1700,
  },
  trombone: {
    url: "https://upload.wikimedia.org/wikipedia/commons/3/35/Sad_Trombone-Joe_Lamb-665429450.ogg",
    volume: 0.8,
    durationMs: 3000,
  },
};

const audioCache = new Map<string, HTMLAudioElement>();
const stopTimers = new Map<string, number>();

function getAudio(cue: NaturalCue): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") return null;
  const cached = audioCache.get(cue.url);
  if (cached) return cached;

  const audio = new Audio(cue.url);
  audio.preload = "auto";
  audio.volume = cue.volume;
  audioCache.set(cue.url, audio);
  return audio;
}

function warmNaturalCues() {
  for (const cue of Object.values(NATURAL_CUES)) {
    if (!cue) continue;
    const audio = getAudio(cue);
    if (audio) audio.load();
  }
}

async function playNaturalCue(key: string | null): Promise<boolean> {
  if (!key) return false;
  const cue = NATURAL_CUES[key];
  if (!cue) return false;
  const audio = getAudio(cue);
  if (!audio) return false;

  const previousTimer = stopTimers.get(cue.url);
  if (previousTimer) window.clearTimeout(previousTimer);

  try {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = cue.volume;
    await audio.play();
    const timer = window.setTimeout(() => {
      audio.pause();
      try {
        audio.currentTime = 0;
      } catch {
        // Some browsers detach the media timeline after a remote error.
      }
      stopTimers.delete(cue.url);
    }, cue.durationMs);
    stopTimers.set(cue.url, timer);
    return true;
  } catch {
    return false;
  }
}

export async function armBuzzerAudio(): Promise<boolean> {
  const armed = await armFallbackAudio();
  if (armed) warmNaturalCues();
  return armed;
}

export async function playBuiltInCue(key: string | null): Promise<void> {
  if (await playNaturalCue(key)) return;
  await playFallbackBuiltInCue(key);
}

export async function playWinnerCue(
  soundType: "builtin" | "custom" | null,
  soundKey: string | null,
  customUrl: string | null,
): Promise<void> {
  if (soundType === "builtin" && await playNaturalCue(soundKey)) return;
  await playFallbackWinnerCue(soundType, soundKey, customUrl);
}
