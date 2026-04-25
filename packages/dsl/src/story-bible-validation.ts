import type { StoryBible } from "./story-bible-schema.js";

export type StoryBibleValidationCode = "missing_character" | "missing_clue";

export interface StoryBibleDiagnostic {
  readonly severity: "error";
  readonly code: StoryBibleValidationCode;
  readonly path: string;
  readonly message: string;
}

interface ReferenceContext {
  readonly characterIds: ReadonlySet<string>;
  readonly clueIds: ReadonlySet<string>;
}

export function validateStoryBibleReferences(storyBible: StoryBible): StoryBibleDiagnostic[] {
  const context: ReferenceContext = {
    characterIds: new Set(storyBible.characters.map((character) => character.id)),
    clueIds: new Set(storyBible.clues.map((clue) => clue.id)),
  };

  return [
    ...validateTimelineActors(storyBible, context),
    ...validateCharacterRelations(storyBible, context),
    ...validateClueSources(storyBible, context),
    ...validateClueKnowledgeScope(storyBible, context),
    ...validateActScenes(storyBible, context),
  ];
}

function validateTimelineActors(
  storyBible: StoryBible,
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  return storyBible.truth.timeline.flatMap((event) =>
    event.actor_ids.flatMap((actorId, index) =>
      missingCharacterDiagnostics(actorId, `truth.timeline.${event.id}.actor_ids[${index}]`, context),
    ),
  );
}

function validateCharacterRelations(
  storyBible: StoryBible,
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  return storyBible.characters.flatMap((character) =>
    character.relations.flatMap((relation, index) =>
      missingCharacterDiagnostics(
        relation.target_character_id,
        `characters.${character.id}.relations[${index}].target_character_id`,
        context,
      ),
    ),
  );
}

function validateClueSources(
  storyBible: StoryBible,
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  return storyBible.clues.flatMap((clue) =>
    clue.source_character_ids.flatMap((characterId, index) =>
      missingCharacterDiagnostics(
        characterId,
        `clues.${clue.id}.source_character_ids[${index}]`,
        context,
      ),
    ),
  );
}

function validateClueKnowledgeScope(
  storyBible: StoryBible,
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  return storyBible.clues.flatMap((clue) =>
    clue.knowledge_scope.flatMap((scope, index) => {
      if (scope.kind !== "role") {
        return [];
      }

      return missingCharacterDiagnostics(scope.value, `clues.${clue.id}.knowledge_scope[${index}]`, context);
    }),
  );
}

function validateActScenes(
  storyBible: StoryBible,
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  return storyBible.acts.flatMap((act) =>
    act.scenes.flatMap((scene) => [
      ...validateSceneExpectedReveals(act.id, scene, context),
      ...validateSceneActionReveals(act.id, scene, context),
    ]),
  );
}

function validateSceneExpectedReveals(
  actId: string,
  scene: StoryBible["acts"][number]["scenes"][number],
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  return scene.expected_reveals.flatMap((clueId, index) =>
    missingClueDiagnostics(clueId, `acts.${actId}.scenes.${scene.id}.expected_reveals[${index}]`, context),
  );
}

function validateSceneActionReveals(
  actId: string,
  scene: StoryBible["acts"][number]["scenes"][number],
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  return scene.available_actions.flatMap((action) =>
    action.reveals_clue_ids.flatMap((clueId, index) =>
      missingClueDiagnostics(
        clueId,
        `acts.${actId}.scenes.${scene.id}.available_actions.${action.id}.reveals_clue_ids[${index}]`,
        context,
      ),
    ),
  );
}

function missingCharacterDiagnostics(
  characterId: string,
  path: string,
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  if (context.characterIds.has(characterId)) {
    return [];
  }

  return [
    {
      severity: "error",
      code: "missing_character",
      path,
      message: `Missing character reference: ${characterId}`,
    },
  ];
}

function missingClueDiagnostics(
  clueId: string,
  path: string,
  context: ReferenceContext,
): StoryBibleDiagnostic[] {
  if (context.clueIds.has(clueId)) {
    return [];
  }

  return [
    {
      severity: "error",
      code: "missing_clue",
      path,
      message: `Missing clue reference: ${clueId}`,
    },
  ];
}
