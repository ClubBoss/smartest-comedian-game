# Decision Log

## D-001 - Separate Git repository
Status: accepted.

The project uses a dedicated Git repository. ChatGPT project chat acts as product/manager layer; Git is implementation source of truth.

## D-002 - Player capacity is 2-10
Status: accepted.

No part of product logic or layout may assume a fixed party size such as 8.

## D-003 - Questions are editable persistent content
Status: accepted.

Questions, ordered hints, answers and supporting metadata are stored in the backend and managed through a host-facing Question Bank. Adding content must not require code changes or deployment.

## D-004 - Host remains authoritative
Status: accepted.

The product automates state synchronization and arbitration, not comedic judgment. Host can manually adjust scores and recover state.

## D-005 - Server decides first buzz
Status: accepted.

Buzz winner is determined atomically by server/database acceptance order. Client timestamps are not trusted.

## D-006 - Web first
Status: accepted.

No mandatory native app. Players join by URL/QR with minimal friction.
