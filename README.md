# Smartest Comedian Game

A lightweight realtime party-game engine inspired by comedy quiz panel shows.

## Product goal

Let 2-10 people join a room from their phones, use personal buzzers, see a live scoreboard, and let one host control the game. Questions are data, not code: hosts can add/edit question text, hints, answers, notes, categories, tags, and sources independently of releases.

## V1 surfaces

- Player: join, name, sound, personal score, buzzer.
- Host: create room, manage players, run questions, reveal hints/answers, score players, reset/open buzzer.
- Display: QR/join code, live scoreboard, active question state, buzz winner, reveal states.
- Question Bank: CRUD for questions, hints, answers, categories and metadata.

## V1 hard constraints

- 2-10 players.
- Web only; no app install.
- Host-authoritative score and game state.
- First accepted server-side buzz wins atomically.
- Realtime updates across all clients.
- Refresh/reconnect must recover room state.
- Question content must be editable without code changes.
- No mandatory player accounts.

See `docs/PRODUCT_CONTRACT.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, and `docs/TASKS.md`.
