import { canAccessAnyScope, type ScriptPackage } from "@jubensha/dsl";
import type { RuntimeRoomRecord, RuntimeSeatRecord } from "./runtime-repository.js";

export interface RuntimeVisibleClue {
  readonly clueCode: string;
  readonly title: string;
  readonly content: string;
}

export interface RuntimePublicRole {
  readonly roleCode: string;
  readonly name: string;
  readonly publicProfile: string;
}

export interface RuntimePrivateRole {
  readonly roleCode: string;
  readonly privateSecret: string | null;
}

export interface RuntimePublicSnapshot {
  readonly roomId: string;
  readonly revision: number;
  readonly packageCode: string;
  readonly phase: string;
  readonly roles: readonly RuntimePublicRole[];
  readonly visibleClues: readonly RuntimeVisibleClue[];
}

export interface RuntimeSeatSnapshot extends RuntimePublicSnapshot {
  readonly seat: RuntimeSeatRecord;
  readonly privateRole: RuntimePrivateRole;
}

export interface RuntimeAdminSnapshot extends RuntimePublicSnapshot {
  readonly seats: readonly RuntimeSeatRecord[];
  readonly events: RuntimeRoomRecord["events"];
}

export function projectPublicSnapshot(
  scriptPackage: ScriptPackage,
  room: RuntimeRoomRecord,
): RuntimePublicSnapshot {
  return {
    roomId: room.id,
    revision: room.revision,
    packageCode: room.packageCode,
    phase: room.state.phase,
    roles: scriptPackage.roles.map(toPublicRole),
    visibleClues: visibleCluesForPublic(scriptPackage),
  };
}

export function projectSeatSnapshot(
  scriptPackage: ScriptPackage,
  room: RuntimeRoomRecord,
  seat: RuntimeSeatRecord,
): RuntimeSeatSnapshot {
  const role = readSeatRole(scriptPackage, seat.roleCode);

  return {
    ...projectPublicSnapshot(scriptPackage, room),
    seat,
    privateRole: { roleCode: role.role_code, privateSecret: role.private_secret ?? null },
    visibleClues: visibleCluesForSeat(scriptPackage, seat),
  };
}

export function projectAdminSnapshot(
  scriptPackage: ScriptPackage,
  room: RuntimeRoomRecord,
): RuntimeAdminSnapshot {
  return {
    ...projectPublicSnapshot(scriptPackage, room),
    seats: room.seats,
    events: room.events,
  };
}

function toPublicRole(role: ScriptPackage["roles"][number]): RuntimePublicRole {
  return {
    roleCode: role.role_code,
    name: role.name,
    publicProfile: role.public_profile,
  };
}

function visibleCluesForPublic(scriptPackage: ScriptPackage): readonly RuntimeVisibleClue[] {
  return scriptPackage.clues
    .filter((clue) => canAccessAnyScope(clue.initial_visibility, { kind: "public", value: "all" }))
    .map(toVisibleClue);
}

function visibleCluesForSeat(
  scriptPackage: ScriptPackage,
  seat: RuntimeSeatRecord,
): readonly RuntimeVisibleClue[] {
  return scriptPackage.clues
    .filter((clue) => canSeatAccessClue(clue.initial_visibility, seat))
    .map(toVisibleClue);
}

function canSeatAccessClue(
  scopes: ScriptPackage["clues"][number]["initial_visibility"],
  seat: RuntimeSeatRecord,
): boolean {
  return [
    { kind: "public" as const, value: "all" },
    { kind: "role" as const, value: seat.roleCode },
    { kind: "seat" as const, value: seat.seatId },
  ].some((requester) => canAccessAnyScope(scopes, requester));
}

function toVisibleClue(clue: ScriptPackage["clues"][number]): RuntimeVisibleClue {
  return { clueCode: clue.clue_code, title: clue.title, content: clue.content };
}

function readSeatRole(scriptPackage: ScriptPackage, roleCode: string): ScriptPackage["roles"][number] {
  const role = scriptPackage.roles.find((candidate) => candidate.role_code === roleCode);

  if (!role) {
    throw new Error(`Runtime seat role not found: ${roleCode}`);
  }

  return role;
}
