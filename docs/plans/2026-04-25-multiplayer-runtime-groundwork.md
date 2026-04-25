# Multiplayer Runtime Groundwork Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans before implementing any multiplayer runtime changes.

**Goal:** Document the exact runtime primitives needed before adding real multiplayer rooms, broadcasts, reconnects, or observers.

**Architecture:** Keep the current single-room runtime authoritative and replayable. Multiplayer should extend the existing event log and scoped visibility model rather than allowing clients to mutate room state directly. No websocket server, matchmaking, or live multiplayer UI should be added before these primitives are explicit and tested.

**Tech Stack:** TypeScript, NestJS, existing runtime repository/service, existing `@jubensha/dsl` scope and runtime state types, Vitest.

---

## Implementation Update - 2026-04-25

Implemented in the first multiplayer groundwork slice:
- Runtime rooms now create deterministic `seat_1...seat_n` assignments from package roles.
- Joining a seat records `playerId`, connection state, and increments room revision.
- Duplicate seat joins, duplicate player joins, invalid seat count, and stale action revisions fail explicitly.
- Runtime exposes public, seat-private, and admin snapshot projections without leaking `private_secret` to public snapshots.
- HTTP routes and API contract metadata now cover seat join, scoped snapshots, admin snapshot, and revision-aware actions.
- PostgreSQL runtime persistence now stores `seats` and `revision` with explicit schema columns.

Still intentionally not implemented:
- No websocket or SSE transport.
- No matchmaking.
- No client-side authority or hidden conflict retry.

---

## Current Runtime Baseline

Implemented today:
- `RuntimeService.createRoom()` creates one authoritative room state from a released script version.
- `applyRoomAction()` evaluates actions against the current scene and appends an `action_applied` event.
- `replayRoom()` rebuilds state from the event log.
- `RuntimeState` already carries `seatCount`, clue visibility, NPC events, messages, scores, and phase.
- HTTP endpoints expose create/list/get/apply/replay, but there is no seat identity or broadcast protocol.

---

## Missing Multiplayer Primitives

### Seat Assignment

Needed before multiplayer:
- `RuntimeSeatRecord` with `seatId`, `roleCode`, `playerId`, `connected`, and `lastSeenAt`.
- Deterministic seat creation from package roles and requested seat count.
- Explicit errors for duplicate joins, invalid seat count, and joining released room snapshots.

### Scoped Snapshot Projection

Needed before any client broadcast:
- Public room snapshot for observer/play lobby.
- Seat-private snapshot for one player.
- Admin/debug snapshot for operators.
- Projection must reuse DSL scope rules and never expose private role secrets through public channels.

### Broadcast Events

Needed before websocket/SSE:
- Event envelope with `eventId`, `roomId`, `scope`, `createdAt`, and payload type.
- Broadcast projection derived from committed runtime events, not from client proposals.
- Replayable conversion from event log to broadcast stream.

### Concurrency And Idempotency

Needed before multiple clients act at once:
- Monotonic room revision or event sequence.
- Action requests include expected revision.
- Explicit conflict error when a client acts on a stale revision.
- Idempotency key support for reconnect/retry safety.

### Reconnect Snapshot

Needed before mobile/browser reconnect:
- `GET /runtime/rooms/:roomId/seats/:seatId/snapshot` style endpoint.
- Snapshot includes current revision and missed broadcast events.
- Reconnect should never re-run actions; it only reads committed state.

### Observer Mode

Needed after scoped snapshots:
- Observer receives only public projection.
- Observer cannot apply actions.
- Observer joins do not change seat count or script package state.

---

## Recommended Implementation Order

1. Add seat records and seat assignment tests.
2. Add scoped snapshot projector tests.
3. Add event sequence/revision to runtime repository records.
4. Add expected-revision conflict tests for `applyRoomAction()`.
5. Add reconnect snapshot read endpoint.
6. Add observer read-only endpoint.
7. Only then evaluate SSE/WebSocket transport.

---

## Non-Goals For The Next Release

- No websocket or SSE server.
- No matchmaking.
- No live multi-client UI.
- No client-side authority over room state.
- No hidden conflict retries.

---

## Acceptance Criteria Before Multiplayer Sprint

- Single-player runtime tests still pass unchanged.
- Seat assignment cannot leak private role data.
- Snapshot projection has explicit public/private/admin modes.
- Runtime action application is revision-aware.
- Reconnect reads committed state without replaying new actions.
