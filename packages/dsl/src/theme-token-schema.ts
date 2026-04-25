import { z } from "zod";

const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const ThemePaletteSchema = z.object({
  primary: HexColor,
  secondary: HexColor,
  accent: HexColor,
  background: HexColor,
});

export const CoverDirectionSchema = z.object({
  headline: z.string().min(1),
  composition: z.string().min(1),
  lighting: z.string().min(1),
  mood: z.string().min(1),
});

export const CharacterPortraitCueSchema = z.object({
  costume: z.string().min(1),
  expression: z.string().min(1),
  prop: z.string().min(1),
  palette_role: z.enum(["primary", "secondary", "accent", "background"]),
});

export const ClueVisualCueSchema = z.object({
  object: z.string().min(1),
  condition: z.string().min(1),
  material: z.string().min(1),
  symbolic_meaning: z.string().min(1),
});

export const ThemeTokenSchema = z.object({
  tone: z.string().min(1),
  palette: ThemePaletteSchema,
  motifs: z.array(z.string().min(1)).min(1),
  cover_direction: CoverDirectionSchema,
  character_portrait_cues: z.record(CharacterPortraitCueSchema),
  clue_visual_cues: z.record(ClueVisualCueSchema),
});
export type ThemeToken = z.infer<typeof ThemeTokenSchema>;

export const ThemeAssetDescriptorSchema = z.object({
  asset_code: z.string().min(1),
  kind: z.enum(["cover", "character", "clue"]),
  prompt: z.string().min(1),
  theme_motifs: z.array(z.string().min(1)).min(1),
});
export type ThemeAssetDescriptor = z.infer<typeof ThemeAssetDescriptorSchema>;

export const ThemeAssetManifestSchema = z
  .object({
    story_title: z.string().min(1),
    theme_token: ThemeTokenSchema,
    assets: z.array(ThemeAssetDescriptorSchema).min(1),
  })
  .superRefine((manifest, context) => addDuplicateAssetIssue(manifest.assets, context));
export type ThemeAssetManifest = z.infer<typeof ThemeAssetManifestSchema>;

export function parseThemeToken(input: unknown): ThemeToken {
  return ThemeTokenSchema.parse(input);
}

export function parseThemeAssetManifest(input: unknown): ThemeAssetManifest {
  return ThemeAssetManifestSchema.parse(input);
}

export function safeParseThemeAssetManifest(input: unknown) {
  return ThemeAssetManifestSchema.safeParse(input);
}

function addDuplicateAssetIssue(
  assets: readonly ThemeAssetDescriptor[],
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();

  for (const asset of assets) {
    if (seen.has(asset.asset_code)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assets", "asset_code"],
        message: `Duplicate asset_code: ${asset.asset_code}`,
      });
      return;
    }

    seen.add(asset.asset_code);
  }
}
