# AGENTS.md

## Mission
Build the smallest reliable realtime party-game engine that maximizes in-room fun and minimizes setup friction.

## Engineering rules
- Small reversible diffs.
- TypeScript strict mode.
- Server-authoritative writes for score, buzz winner and room state.
- Never trust client timestamps for buzz ordering.
- Player count is data-driven within 2-10; never hardcode 8.
- Question content is data, never compiled into UI components.
- Mobile-first Player UI; TV-first Display UI; control-density optimized Host UI.
- Add tests for every state transition that can corrupt a live game.
- Keep CI green before merge.

## Product rules
- Phones are controllers, not the primary content surface.
- Host can always recover from mistakes manually.
- Every destructive host action must be reversible or explicitly confirmed.
- The game must remain usable if question-bank features are temporarily ignored.
