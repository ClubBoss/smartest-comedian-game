type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

type ToneOptions = {
  start?: number;
  duration: number;
  from: number;
  to?: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
};

type NoiseOptions = {
  start?: number;
  duration: number;
  volume?: number;
  filter?: BiquadFilterType;
  frequency?: number;
};

let sharedContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedContext && sharedContext.state !== "closed") return sharedContext;

  const AudioContextClass = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedContext = new AudioContextClass();
  return sharedContext;
}

async function ensureRunningContext(): Promise<AudioContext | null> {
  const context = getAudioContext();
  if (!context) return null;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      return null;
    }
  }
  return context;
}

export async function armBuzzerAudio(): Promise<boolean> {
  const context = await ensureRunningContext();
  return context?.state === "running";
}

function tone(context: AudioContext, output: AudioNode, options: ToneOptions) {
  const start = context.currentTime + (options.start ?? 0);
  const duration = options.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(options.from, start);
  if (options.to && options.to > 0) {
    oscillator.frequency.exponentialRampToValueAtTime(options.to, start + duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(options.volume ?? 0.24, start + Math.min(options.attack ?? 0.012, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(context: AudioContext, output: AudioNode, options: NoiseOptions) {
  const start = context.currentTime + (options.start ?? 0);
  const frames = Math.max(1, Math.floor(context.sampleRate * options.duration));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = options.filter ?? "bandpass";
  filter.frequency.setValueAtTime(options.frequency ?? 1000, start);
  gain.gain.setValueAtTime(options.volume ?? 0.08, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(start);
}

function ping(context: AudioContext, output: AudioNode, start: number, frequency: number, volume = 0.2) {
  tone(context, output, { start, duration: 0.42, from: frequency, type: "sine", volume, attack: 0.004 });
  tone(context, output, { start, duration: 0.28, from: frequency * 1.5, type: "sine", volume: volume * 0.45, attack: 0.003 });
}

function scheduleBuiltIn(context: AudioContext, key: string | null, output: AudioNode): number {
  switch (key) {
    case "duck":
      tone(context, output, { duration: 0.17, from: 390, to: 175, type: "square", volume: 0.18 });
      noise(context, output, { duration: 0.13, volume: 0.05, filter: "bandpass", frequency: 850 });
      tone(context, output, { start: 0.19, duration: 0.16, from: 330, to: 165, type: "square", volume: 0.16 });
      noise(context, output, { start: 0.19, duration: 0.12, volume: 0.045, filter: "bandpass", frequency: 760 });
      return 0.42;
    case "airhorn":
      tone(context, output, { duration: 0.7, from: 185, to: 195, type: "sawtooth", volume: 0.16, attack: 0.025 });
      tone(context, output, { duration: 0.7, from: 233, to: 245, type: "sawtooth", volume: 0.12, attack: 0.025 });
      tone(context, output, { duration: 0.7, from: 277, to: 289, type: "square", volume: 0.06, attack: 0.025 });
      return 0.78;
    case "bell":
      ping(context, output, 0, 920, 0.2);
      ping(context, output, 0.16, 920, 0.16);
      return 0.7;
    case "gong":
      tone(context, output, { duration: 1.25, from: 112, to: 104, type: "sine", volume: 0.24, attack: 0.015 });
      tone(context, output, { duration: 0.95, from: 168, to: 156, type: "sine", volume: 0.12, attack: 0.01 });
      tone(context, output, { duration: 0.72, from: 252, to: 235, type: "sine", volume: 0.07, attack: 0.008 });
      noise(context, output, { duration: 0.22, volume: 0.035, filter: "lowpass", frequency: 700 });
      return 1.3;
    case "siren":
      tone(context, output, { duration: 0.34, from: 470, to: 920, type: "sawtooth", volume: 0.13 });
      tone(context, output, { start: 0.34, duration: 0.34, from: 920, to: 470, type: "sawtooth", volume: 0.13 });
      tone(context, output, { start: 0.68, duration: 0.34, from: 470, to: 920, type: "sawtooth", volume: 0.13 });
      return 1.08;
    case "bike":
      ping(context, output, 0, 1260, 0.17);
      ping(context, output, 0.28, 1390, 0.14);
      return 0.75;
    case "kazoo":
      tone(context, output, { duration: 0.14, from: 410, to: 455, type: "square", volume: 0.1 });
      tone(context, output, { start: 0.14, duration: 0.14, from: 450, to: 400, type: "square", volume: 0.1 });
      tone(context, output, { start: 0.28, duration: 0.14, from: 405, to: 475, type: "square", volume: 0.1 });
      tone(context, output, { start: 0.42, duration: 0.2, from: 465, to: 390, type: "square", volume: 0.1 });
      noise(context, output, { duration: 0.62, volume: 0.025, filter: "bandpass", frequency: 950 });
      return 0.7;
    case "whistle":
      tone(context, output, { duration: 0.52, from: 1280, to: 1780, type: "sine", volume: 0.18, attack: 0.02 });
      tone(context, output, { start: 0.06, duration: 0.42, from: 2560, to: 3400, type: "sine", volume: 0.035, attack: 0.02 });
      return 0.6;
    case "horn":
      tone(context, output, { duration: 0.3, from: 410, to: 280, type: "square", volume: 0.14 });
      tone(context, output, { start: 0.3, duration: 0.28, from: 340, to: 225, type: "square", volume: 0.12 });
      return 0.65;
    case "buzzer":
      for (const start of [0, 0.22, 0.44]) {
        tone(context, output, { start, duration: 0.16, from: 155, to: 145, type: "sawtooth", volume: 0.15, attack: 0.004 });
      }
      return 0.68;
    case "goat":
      tone(context, output, { duration: 0.18, from: 260, to: 690, type: "sawtooth", volume: 0.12 });
      tone(context, output, { start: 0.18, duration: 0.35, from: 690, to: 285, type: "sawtooth", volume: 0.13 });
      noise(context, output, { duration: 0.52, volume: 0.04, filter: "bandpass", frequency: 1200 });
      tone(context, output, { start: 0.58, duration: 0.15, from: 300, to: 620, type: "sawtooth", volume: 0.1 });
      tone(context, output, { start: 0.73, duration: 0.28, from: 620, to: 250, type: "sawtooth", volume: 0.11 });
      return 1.08;
    case "rooster":
      tone(context, output, { duration: 0.15, from: 620, to: 1040, type: "square", volume: 0.08 });
      tone(context, output, { start: 0.16, duration: 0.14, from: 780, to: 1390, type: "square", volume: 0.09 });
      tone(context, output, { start: 0.31, duration: 0.2, from: 920, to: 1580, type: "square", volume: 0.1 });
      tone(context, output, { start: 0.52, duration: 0.34, from: 1060, to: 690, type: "square", volume: 0.1 });
      noise(context, output, { start: 0.1, duration: 0.76, volume: 0.025, filter: "highpass", frequency: 1800 });
      return 0.95;
    case "boing":
      tone(context, output, { duration: 0.72, from: 720, to: 145, type: "sine", volume: 0.2 });
      for (let index = 0; index < 5; index += 1) {
        tone(context, output, { start: 0.08 + index * 0.1, duration: 0.12, from: 520 - index * 55, to: 330 - index * 35, type: "triangle", volume: 0.055 });
      }
      return 0.8;
    case "laser":
      tone(context, output, { duration: 0.48, from: 1750, to: 85, type: "sawtooth", volume: 0.12 });
      tone(context, output, { start: 0.04, duration: 0.4, from: 1180, to: 65, type: "square", volume: 0.045 });
      return 0.55;
    case "rimshot":
      tone(context, output, { duration: 0.13, from: 145, to: 68, type: "sine", volume: 0.2 });
      tone(context, output, { start: 0.22, duration: 0.12, from: 215, to: 112, type: "triangle", volume: 0.15 });
      noise(context, output, { start: 0.22, duration: 0.14, volume: 0.08, filter: "bandpass", frequency: 1800 });
      noise(context, output, { start: 0.43, duration: 0.38, volume: 0.055, filter: "highpass", frequency: 5200 });
      return 0.88;
    case "trombone": {
      const notes = [330, 294, 262, 220];
      notes.forEach((frequency, index) => {
        tone(context, output, { start: index * 0.23, duration: 0.28, from: frequency, to: frequency * 0.94, type: "sawtooth", volume: 0.1, attack: 0.018 });
      });
      return 1.05;
    }
    default:
      tone(context, output, { duration: 0.45, from: 440, type: "sine", volume: 0.16 });
      return 0.5;
  }
}

export async function playBuiltInCue(key: string | null): Promise<void> {
  const context = await ensureRunningContext();
  if (!context) return;

  const master = context.createGain();
  master.gain.setValueAtTime(0.8, context.currentTime);
  master.connect(context.destination);
  const duration = scheduleBuiltIn(context, key, master);

  window.setTimeout(() => {
    try {
      master.disconnect();
    } catch {
      // The graph may already be detached by the browser.
    }
  }, Math.ceil((duration + 0.25) * 1000));
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
