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
Software synchronizes state and arbitration; host owns answer judgment and score overrides.

## D-005 - Server decides first buzz
Status: accepted.
Atomic server/database acceptance order determines the normal winner; client timestamps are not trusted.

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

## D-010 - Fresh eligibility every buzz cycle
Status: accepted.
A player who answered incorrectly, neutrally, or correctly remains eligible in every later buzz cycle of the same question. A winner only locks everyone else for the current cycle.

## D-011 - Ordered question queue is V1
Status: accepted.
The host can prepare/reorder/skip an ordered queue so live hosting is not interrupted by searching the Question Bank.

## D-012 - Default answer scoring is +1 / 0 / -1
Status: accepted.
Normal answer resolution uses +1, 0, or -1. Manual arbitrary integer adjustment exists for special questions/situations. Zero-value answer resolution is recorded.

## D-013 - Answer variants and host notes are snapshot content
Status: accepted.
Acceptable answer examples and private host notes are stored with the source question and copied into the immutable live question snapshot.

## D-014 - Host can override the buzz winner
Status: accepted.
Server arbitration is the normal path, but the host can replace/assign a winner when a device or connection fails. Winner source is recorded as `buzz` or `host` so recovery does not erase provenance.

## D-015 - Selecting a question does not reveal it
Status: accepted.
A live question can be preloaded privately for the host. Shared Display/players see learner-facing text/images only after `stimulus_revealed` is explicitly enabled.

## D-016 - Normal answer score links to its buzz cycle
Status: accepted.
A normal +1/0/-1 resolution references the exact buzz cycle that produced the answer. Manual special-score events may exist without a buzz cycle. This preserves an unambiguous live-game audit trail across repeated answers.
