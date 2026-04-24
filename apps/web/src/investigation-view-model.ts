import type { RuntimeState, ScenePhase } from "@jubensha/dsl";
import type { ScriptClue, ScriptPackage, ScriptRole } from "@jubensha/dsl";

export interface ClueCardView {
  readonly code: string;
  readonly title: string;
  readonly content: string;
  readonly revealed: boolean;
}

export interface TimelineEntryView {
  readonly id: string;
  readonly label: string;
  readonly kind: "scene" | "npc_event";
}

export interface SuspectView {
  readonly code: string;
  readonly name: string;
  readonly profile: string;
  readonly evidenceCount: number;
}

export interface PhaseSummaryView {
  readonly phase: ScenePhase;
  readonly label: string;
}

export interface InvestigationViewModel {
  readonly title: string;
  readonly activePhase: PhaseSummaryView;
  readonly clueBoard: readonly ClueCardView[];
  readonly timeline: readonly TimelineEntryView[];
  readonly suspects: readonly SuspectView[];
}

const PHASE_LABELS: Readonly<Record<ScenePhase, string>> = {
  intro: "序幕阶段",
  investigation: "搜证阶段",
  interrogation: "盘问阶段",
  emotion: "情绪阶段",
  vote: "投票阶段",
  reveal: "揭晓阶段",
  epilogue: "尾声阶段",
  custom: "自定义阶段",
};

export function buildInvestigationViewModel(
  scriptPackage: ScriptPackage,
  state: RuntimeState,
): InvestigationViewModel {
  return {
    title: scriptPackage.title,
    activePhase: { phase: state.phase, label: PHASE_LABELS[state.phase] },
    clueBoard: scriptPackage.clues.map((clue) => createClueCard(clue, state)),
    timeline: createTimeline(scriptPackage, state),
    suspects: scriptPackage.roles.map((role) => createSuspect(role, scriptPackage, state)),
  };
}

function createClueCard(clue: ScriptClue, state: RuntimeState): ClueCardView {
  const revealed = state.revealedClues.includes(clue.clue_code);

  return {
    code: clue.clue_code,
    title: clue.title,
    content: revealed ? clue.content : "尚未揭示",
    revealed,
  };
}

function createTimeline(
  scriptPackage: ScriptPackage,
  state: RuntimeState,
): TimelineEntryView[] {
  return [
    ...scriptPackage.scenes.map((scene) => ({
      id: `scene:${scene.scene_code}`,
      label: scene.title ?? scene.scene_code,
      kind: "scene" as const,
    })),
    ...state.npcEvents.map((event, index) => ({
      id: `npc:${index}`,
      label: `${readRoleName(scriptPackage, event.npcCode)}：${event.event}`,
      kind: "npc_event" as const,
    })),
  ];
}

function createSuspect(
  role: ScriptRole,
  scriptPackage: ScriptPackage,
  state: RuntimeState,
): SuspectView {
  return {
    code: role.role_code,
    name: role.name,
    profile: role.public_profile,
    evidenceCount: countEvidence(role, scriptPackage, state),
  };
}

function countEvidence(
  role: ScriptRole,
  scriptPackage: ScriptPackage,
  state: RuntimeState,
): number {
  return countRoleClueMentions(role, scriptPackage, state) + countRoleEvents(role, state);
}

function countRoleClueMentions(
  role: ScriptRole,
  scriptPackage: ScriptPackage,
  state: RuntimeState,
): number {
  return scriptPackage.clues.filter((clue) => {
    return state.revealedClues.includes(clue.clue_code) && clue.content.includes(role.name);
  }).length;
}

function countRoleEvents(role: ScriptRole, state: RuntimeState): number {
  return state.npcEvents.filter((event) => event.npcCode === role.role_code).length;
}

function readRoleName(scriptPackage: ScriptPackage, roleCode: string): string {
  return scriptPackage.roles.find((role) => role.role_code === roleCode)?.name ?? roleCode;
}
