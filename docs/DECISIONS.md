# Decision Log

## D-001 - Separate Git repository
Status: accepted.

Dedicated repository is implementation source of truth; this chat is product/manager layer.

## D-002 - Player capacity is 2-10
Status: accepted.

No logic or layout may assume exactly 8 players.

## D-003 - Questions are editable persistent content
Status: accepted.

Questions, ordered hints, answers and metadata are backend content. Adding/editing them requires no deployment.

## D-004 - Host remains authoritative
Status: accepted.

Software synchronizes state and arbitration; host owns comedic judgment and score overrides.

## D-005 - Server decides first buzz
Status: accepted.

Atomic server/database acceptance order determines the winner; client timestamps are not trusted.

## D-006 - Web first
Status: accepted.

No mandatory native app. Join by URL/QR.

## D-007 - Core game does not depend on Question Bank
Status: accepted.

Rooms and buzz cycles may run without a selected question session.

## D-008 - Photo questions are first-class V1 content
Status: accepted.

A question may contain text, one or more ordered images, or both. Question media is uploaded content and is snapshot into live rounds so later edits do not rewrite history.

## D-009 - Player sound is extensible media identity
Status: accepted.

Every player has an individual buzzer sound. The model supports both built-in sound keys and player-specific uploaded short audio without requiring a future player-schema migration.
