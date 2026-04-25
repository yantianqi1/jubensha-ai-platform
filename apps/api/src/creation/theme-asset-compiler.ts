import type { StoryBible, ThemeAssetDescriptor, ThemeAssetManifest, ThemeToken } from "@jubensha/dsl";

const DEFAULT_PALETTE = {
  primary: "#1f2937",
  secondary: "#334155",
  accent: "#b45309",
  background: "#f8fafc",
};

export function compileThemeAssets(storyBible: StoryBible): ThemeAssetManifest {
  const themeToken = compileThemeToken(storyBible);

  return {
    story_title: storyBible.meta.title,
    theme_token: themeToken,
    assets: [
      compileCoverAsset(themeToken),
      ...storyBible.characters.map((character) => compileCharacterAsset(character, themeToken)),
      ...storyBible.clues.map((clue) => compileClueAsset(clue, themeToken)),
    ],
  };
}

function compileThemeToken(storyBible: StoryBible): ThemeToken {
  return {
    tone: storyBible.theme.tone,
    palette: DEFAULT_PALETTE,
    motifs: readMotifs(storyBible),
    cover_direction: {
      headline: storyBible.meta.title,
      composition: `${storyBible.theme.premise}；核心场景：${storyBible.acts[0]?.title ?? storyBible.meta.genre}`,
      lighting: "低调戏剧光",
      mood: storyBible.theme.tone,
    },
    character_portrait_cues: Object.fromEntries(
      storyBible.characters.map((character) => [character.id, readCharacterCue(character)]),
    ),
    clue_visual_cues: Object.fromEntries(
      storyBible.clues.map((clue) => [clue.id, readClueCue(clue)]),
    ),
  };
}

function readMotifs(storyBible: StoryBible): string[] {
  return unique([storyBible.meta.genre, storyBible.acts[0]?.title, storyBible.clues[0]?.title]);
}

function readCharacterCue(character: StoryBible["characters"][number]) {
  return {
    costume: character.public_profile,
    expression: character.fear,
    prop: character.goal,
    palette_role: "secondary" as const,
  };
}

function readClueCue(clue: StoryBible["clues"][number]) {
  return {
    object: clue.title,
    condition: clue.content,
    material: clue.red_herring ? "误导性视觉材质" : "关键证据材质",
    symbolic_meaning: clue.red_herring ? "误导玩家判断" : "指向核心真相",
  };
}

function compileCoverAsset(themeToken: ThemeToken): ThemeAssetDescriptor {
  const cover = themeToken.cover_direction;

  return {
    asset_code: "cover",
    kind: "cover",
    prompt: `${cover.headline}封面，${cover.composition}，${cover.lighting}，${cover.mood}`,
    theme_motifs: themeToken.motifs,
  };
}

function compileCharacterAsset(
  character: StoryBible["characters"][number],
  themeToken: ThemeToken,
): ThemeAssetDescriptor {
  const cue = themeToken.character_portrait_cues[character.id];

  return {
    asset_code: `character.${character.id}`,
    kind: "character",
    prompt: `${character.name}角色照，${cue?.costume}，${cue?.expression}，携带${cue?.prop}`,
    theme_motifs: themeToken.motifs,
  };
}

function compileClueAsset(
  clue: StoryBible["clues"][number],
  themeToken: ThemeToken,
): ThemeAssetDescriptor {
  const cue = themeToken.clue_visual_cues[clue.id];

  return {
    asset_code: `clue.${clue.id}`,
    kind: "clue",
    prompt: `${clue.title}线索图，${cue?.condition}，${cue?.material}，${clue.content}`,
    theme_motifs: themeToken.motifs,
  };
}

function unique(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}
