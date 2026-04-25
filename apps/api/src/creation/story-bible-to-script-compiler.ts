import type { Effect, ScriptClue, ScriptPackage, ScriptRole, StoryBible } from "@jubensha/dsl";

const PUBLIC_SCOPE = { kind: "public" as const, value: "all" };
const DEFAULT_PACKAGE_CODE = "story_bible_draft";

export function compileStoryBibleToScriptPackage(storyBible: StoryBible): ScriptPackage {
  const roles = compileRoles(storyBible.characters);
  const clues = compileClues(storyBible.clues);
  const firstClueCode = readFirstClueCode(clues);
  const investigationScenes = compileInvestigationScenes(storyBible, firstClueCode);

  return {
    package_code: DEFAULT_PACKAGE_CODE,
    title: storyBible.meta.title,
    status: "draft",
    roles,
    clues,
    scenes: [createIntroScene(), ...investigationScenes],
    meta: {
      summary: storyBible.theme.premise,
      tags: [storyBible.meta.genre, storyBible.meta.difficulty],
      player_count: storyBible.meta.player_count,
      truth: storyBible.truth.killer_or_core_secret,
    },
  };
}

function compileRoles(characters: StoryBible["characters"]): ScriptRole[] {
  return characters.map((character) => ({
    role_code: character.id,
    name: character.name,
    public_profile: character.public_profile,
    private_secret: character.private_secret,
  }));
}

function compileClues(clues: StoryBible["clues"]): ScriptClue[] {
  return clues.map((clue) => ({
    clue_code: clue.id,
    title: clue.title,
    content: clue.content,
    initial_visibility: clue.knowledge_scope,
    unlock_if: clue.unlock_conditions,
  }));
}

function compileInvestigationScenes(
  storyBible: StoryBible,
  firstClueCode: string,
): ScriptPackage["scenes"] {
  const scenes = storyBible.acts.flatMap((act) => act.scenes);

  if (scenes.length === 0) {
    return [createInvestigationScene(firstClueCode)];
  }

  return scenes.map((scene) => ({
    scene_code: scene.id,
    title: scene.title,
    phase: "investigation" as const,
    entry_if: scene.entry_conditions,
    visible_to: [PUBLIC_SCOPE],
    actions: scene.available_actions.map((action) => ({
      code: action.id,
      label: action.label,
      allow_if: action.unlock_conditions,
      effect: compileRevealEffects(action.reveals_clue_ids),
    })),
    end_if: compileSceneEndConditions(scene.expected_reveals, firstClueCode),
    win_rule_hooks: compileEndingHooks(storyBible, scene.expected_reveals),
    meta: { notes: scene.objective },
  }));
}

function compileRevealEffects(clueIds: readonly string[]): Effect[] {
  return clueIds.map((clueId) => ({ type: "reveal_clue", clue_code: clueId }));
}

function compileSceneEndConditions(
  expectedRevealIds: readonly string[],
  fallbackClueCode: string,
): ScriptPackage["scenes"][number]["end_if"] {
  const clueIds = expectedRevealIds.length > 0 ? expectedRevealIds : [fallbackClueCode];

  return clueIds.map((clueId) => ({ op: "clue_revealed" as const, clue_code: clueId }));
}

function compileEndingHooks(
  storyBible: StoryBible,
  expectedRevealIds: readonly string[],
): string[] {
  return storyBible.endings.flatMap((ending) =>
    ending.conditions.some((condition) =>
      condition.op === "clue_revealed" && expectedRevealIds.includes(condition.clue_code),
    )
      ? [ending.id]
      : [],
  );
}

function createIntroScene(): ScriptPackage["scenes"][number] {
  return {
    scene_code: "intro",
    title: "开场导入",
    phase: "intro",
    entry_if: [],
    visible_to: [PUBLIC_SCOPE],
    actions: [
      {
        code: "start_investigation",
        label: "开始调查",
        allow_if: [],
        effect: [{ type: "set_flag", flag: "intro_complete", value: true }],
      },
    ],
    end_if: [{ op: "flag_true", flag: "intro_complete" }],
    win_rule_hooks: [],
  };
}

function createInvestigationScene(firstClueCode: string): ScriptPackage["scenes"][number] {
  return {
    scene_code: "investigation",
    title: "现场调查",
    phase: "investigation",
    entry_if: [{ op: "flag_true", flag: "intro_complete" }],
    visible_to: [PUBLIC_SCOPE],
    actions: [
      {
        code: "inspect_scene",
        label: "调查现场",
        allow_if: [],
        effect: [{ type: "reveal_clue", clue_code: firstClueCode }],
      },
    ],
    end_if: [{ op: "clue_revealed", clue_code: firstClueCode }],
    win_rule_hooks: [],
  };
}

function readFirstClueCode(clues: readonly ScriptClue[]): string {
  const firstClue = clues[0];

  if (!firstClue) {
    throw new Error("storyBible.clues must contain at least one item");
  }

  return firstClue.clue_code;
}
