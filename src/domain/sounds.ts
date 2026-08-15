export const BUILTIN_SOUNDS = [
  { key: "duck", label: "Duck quack", emoji: "🦆" },
  { key: "airhorn", label: "Air horn", emoji: "📯" },
  { key: "bell", label: "Hotel bell", emoji: "🔔" },
  { key: "gong", label: "Gong", emoji: "🥁" },
  { key: "siren", label: "Siren", emoji: "🚨" },
  { key: "bike", label: "Bike bell", emoji: "🚲" },
  { key: "kazoo", label: "Kazoo", emoji: "🎺" },
  { key: "whistle", label: "Whistle", emoji: "😙" },
  { key: "horn", label: "Clown horn", emoji: "🤡" },
  { key: "buzzer", label: "Game-show buzzer", emoji: "❌" },
  { key: "goat", label: "Goat scream", emoji: "🐐" },
  { key: "rooster", label: "Rooster", emoji: "🐓" },
  { key: "boing", label: "Boing", emoji: "🪀" },
  { key: "laser", label: "Laser", emoji: "👽" },
  { key: "rimshot", label: "Ba-dum-tss", emoji: "🥁" },
  { key: "trombone", label: "Sad trombone", emoji: "📉" },
] as const;

export const HOST_SOUND_CUES = [
  { key: "applause", label: "Applause", emoji: "👏" },
  { key: "laugh", label: "Laugh", emoji: "😂" },
  { key: "boo", label: "Boo", emoji: "👎" },
  { key: "drumroll", label: "Drumroll", emoji: "🥁" },
  { key: "rimshot", label: "Ba-dum-tss", emoji: "😎" },
  { key: "victory", label: "Victory", emoji: "🎉" },
] as const;

export type BuiltinSoundKey = (typeof BUILTIN_SOUNDS)[number]["key"];
export type HostSoundCueKey = (typeof HOST_SOUND_CUES)[number]["key"];

const SOUND_KEYS = new Set<string>(BUILTIN_SOUNDS.map((sound) => sound.key));
const HOST_CUE_KEYS = new Set<string>(HOST_SOUND_CUES.map((sound) => sound.key));

export function isBuiltinSoundKey(value: string): value is BuiltinSoundKey {
  return SOUND_KEYS.has(value);
}

export function isHostSoundCueKey(value: string): value is HostSoundCueKey {
  return HOST_CUE_KEYS.has(value);
}

export function soundLabel(key: string | null): string {
  return BUILTIN_SOUNDS.find((sound) => sound.key === key)?.label ?? "Custom";
}

export function soundEmoji(key: string | null): string {
  return BUILTIN_SOUNDS.find((sound) => sound.key === key)?.emoji ?? "🎵";
}

export function hostCueLabel(key: HostSoundCueKey): string {
  return HOST_SOUND_CUES.find((sound) => sound.key === key)?.label ?? key;
}
