import type { HostReactionKey } from "@/domain/reactions";
import { playBuiltInCue } from "./buzzer-audio";

function later(delayMs: number, key: string) {
  window.setTimeout(() => void playBuiltInCue(key).catch(() => undefined), delayMs);
}

export async function playHostReaction(key: HostReactionKey): Promise<void> {
  switch (key) {
    case "laugh":
      await playBuiltInCue("kazoo");
      later(155, "kazoo");
      later(310, "goat");
      return;
    case "applause":
      await playBuiltInCue("rimshot");
      later(110, "rimshot");
      later(225, "rimshot");
      later(345, "rimshot");
      return;
    case "ooh":
      await playBuiltInCue("boing");
      return;
    case "shock":
      await playBuiltInCue("siren");
      return;
    case "boo":
      await playBuiltInCue("trombone");
      return;
    case "rimshot":
      await playBuiltInCue("rimshot");
      return;
  }
}
