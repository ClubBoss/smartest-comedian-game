export const HOST_REACTIONS = [
  { key: "laugh", label: "Laugh", emoji: "😂" },
  { key: "applause", label: "Applause", emoji: "👏" },
  { key: "ooh", label: "Ooh!", emoji: "😮" },
  { key: "shock", label: "Shock", emoji: "😱" },
  { key: "boo", label: "Boo", emoji: "😒" },
  { key: "rimshot", label: "Rimshot", emoji: "🥁" },
] as const;

export type HostReactionKey = (typeof HOST_REACTIONS)[number]["key"];

const REACTION_KEYS = new Set<string>(HOST_REACTIONS.map((reaction) => reaction.key));

export function isHostReactionKey(value: string): value is HostReactionKey {
  return REACTION_KEYS.has(value);
}

export function hostReactionLabel(key: string): string {
  return HOST_REACTIONS.find((reaction) => reaction.key === key)?.label ?? "Reaction";
}
