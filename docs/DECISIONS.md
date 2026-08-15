# Decision Log

## D-001 - Separate Git repository
Status: accepted.
Dedicated repository is implementation source of truth; this chat is product/manager layer.

## D-002 - Player capacity is 2-10
Status: accepted.
No logic or layout may assume exactly 8 players.

## D-003 - Questions are editable persistent content
Status: accepted.
Questions, ordered hints, answers and metadata are backend content.

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
A question may contain text, ordered images, or both; live rounds snapshot media references.

## D-009 - Player sound is extensible media identity
Status: accepted.
Every player has an individual buzzer sound; model supports built-in keys and uploaded short audio.

## D-010 - Wrong-answer reopen is first-class
Status: accepted.
The host may judge a winner wrong, lock that player out only for subsequent buzz cycles of the same question, and reopen to remaining eligible players.

## D-011 - Ordered question queue is V1
Status: accepted.
The host can prepare/reorder/skip an ordered queue so live hosting is not interrupted by searching the Question Bank.

## D-012 - Score events carry semantic kind
Status: accepted.
Score changes are append-only and classified as correct, bonus, penalty or manual; optional reason preserves subjective host awards without hardcoding comedy logic.

## D-013 - Answer variants and host notes are snapshot content
Status: accepted.
Acceptable answer examples and private host notes are stored with the source question and copied into the immutable live question snapshot.
