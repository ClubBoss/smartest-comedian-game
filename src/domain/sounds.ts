export const BUILTIN_SOUNDS = [
  { key: "duck", label: "Duck" },
  { key: "airhorn", label: "Air horn" },
  { key: "bell", label: "Bell" },
  { key: "gong", label: "Gong" },
  { key: "siren", label: "Siren" },
  { key: "bike", label: "Bike bell" },
  { key: "kazoo", label: "Kazoo" },
  { key: "whistle", label: "Whistle" },
  { key: "horn", label: "Horn" },
  { key: "buzzer", label: "Buzzer" },
] as const;

export type BuiltinSoundKey = (typeof BUILTIN_SOUNDS)[number]["key"];

const SOUND_KEYS = new Set<string>(BUILTIN_SOUNDS.map((sound) => sound.key));

export function isBuiltinSoundKey(value: string): value is BuiltinSoundKey {
  return SOUND_KEYS.has(value);
}

export function soundLabel(key: string | null): string {
  return BUILTIN_SOUNDS.find((sound) => sound.key === key)?.label ?? "Custom";
}
