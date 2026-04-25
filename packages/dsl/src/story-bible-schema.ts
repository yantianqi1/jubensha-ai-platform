import { z } from "zod";
import { Condition, ScopeRef } from "./schema.js";

const StoryId = z.string().min(1);
const PositiveInteger = z.number().int().positive();

const StoryMetaSchema = z.object({
  title: z.string().min(1),
  genre: z.string().min(1),
  player_count: PositiveInteger,
  duration_minutes: PositiveInteger,
  difficulty: z.string().min(1),
  supernatural_allowed: z.boolean(),
});

const StoryThemeSchema = z.object({
  premise: z.string().min(1),
  theme_statement: z.string().min(1),
  tone: z.string().min(1),
});

const TruthTimelineEventSchema = z.object({
  id: StoryId,
  title: z.string().min(1),
  summary: z.string().min(1),
  actor_ids: z.array(StoryId).default([]),
  reveals_truth_ids: z.array(StoryId).default([]),
});

const StoryTruthSchema = z.object({
  core_case: z.string().min(1),
  killer_or_core_secret: z.string().min(1),
  timeline: z.array(TruthTimelineEventSchema).min(1),
});

const CharacterRelationSchema = z.object({
  target_character_id: StoryId,
  summary: z.string().min(1),
});

const StoryCharacterSchema = z.object({
  id: StoryId,
  name: z.string().min(1),
  public_profile: z.string().min(1),
  private_secret: z.string().min(1),
  goal: z.string().min(1),
  fear: z.string().min(1),
  arc: z.string().min(1),
  relations: z.array(CharacterRelationSchema).default([]),
});

const StoryClueSchema = z.object({
  id: StoryId,
  title: z.string().min(1),
  content: z.string().min(1),
  source_character_ids: z.array(StoryId).default([]),
  reveals_truth_ids: z.array(StoryId).default([]),
  red_herring: z.boolean(),
  unlock_conditions: z.array(Condition).default([]),
  knowledge_scope: z.array(ScopeRef).default([{ kind: "public", value: "all" }]),
});

const StorySceneActionSchema = z.object({
  id: StoryId,
  label: z.string().min(1),
  unlock_conditions: z.array(Condition).default([]),
  reveals_clue_ids: z.array(StoryId).default([]),
});

const StorySceneSchema = z.object({
  id: StoryId,
  title: z.string().min(1),
  objective: z.string().min(1),
  entry_conditions: z.array(Condition).default([]),
  expected_reveals: z.array(StoryId).default([]),
  available_actions: z.array(StorySceneActionSchema).default([]),
});

const StoryActSchema = z.object({
  id: StoryId,
  title: z.string().min(1),
  goal: z.string().min(1),
  scene_seeds: z.array(z.string().min(1)).min(1),
  scenes: z.array(StorySceneSchema).default([]),
});

const StoryEndingSchema = z.object({
  id: StoryId,
  title: z.string().min(1),
  condition: z.string().min(1),
  conditions: z.array(Condition).default([]),
  summary: z.string().min(1),
});

export const StoryBibleSchema = z
  .object({
    meta: StoryMetaSchema,
    theme: StoryThemeSchema,
    truth: StoryTruthSchema,
    characters: z.array(StoryCharacterSchema).min(1),
    clues: z.array(StoryClueSchema).default([]),
    acts: z.array(StoryActSchema).min(1),
    endings: z.array(StoryEndingSchema).min(1),
  })
  .superRefine((storyBible, context) => {
    addDuplicateIssue(context, storyBible.truth.timeline, "truth.timeline");
    addDuplicateIssue(context, storyBible.characters, "characters");
    addDuplicateIssue(context, storyBible.clues, "clues");
    addDuplicateIssue(context, storyBible.acts, "acts");
    addDuplicateIssue(context, storyBible.endings, "endings");
  });
export type StoryBible = z.infer<typeof StoryBibleSchema>;

export function parseStoryBible(input: unknown): StoryBible {
  return StoryBibleSchema.parse(input);
}

export function safeParseStoryBible(input: unknown) {
  return StoryBibleSchema.safeParse(input);
}

function addDuplicateIssue(
  context: z.RefinementCtx,
  items: readonly { readonly id: string }[],
  collection: string,
): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [collection, "id"],
        message: `Duplicate ${collection} id: ${item.id}`,
      });
      return;
    }

    seen.add(item.id);
  }
}
