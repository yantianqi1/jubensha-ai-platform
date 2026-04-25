import { Injectable } from "@nestjs/common";
import type { ThemeAssetDescriptor } from "@jubensha/dsl";

export const THEME_ASSET_PROVIDER = Symbol("THEME_ASSET_PROVIDER");
const IMAGE_COUNT = 1;

export interface OpenAiCompatibleThemeAssetProviderOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly fetch?: typeof fetch;
}

export interface ThemeAssetProviderResult {
  readonly assetCode: string;
  readonly uri: string;
  readonly provider: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ThemeAssetProvider {
  generateAsset(asset: ThemeAssetDescriptor): Promise<ThemeAssetProviderResult>;
}

export class ThemeAssetProviderError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ThemeAssetProviderError";
    this.code = code;
  }
}

@Injectable()
export class UnconfiguredThemeAssetProvider implements ThemeAssetProvider {
  async generateAsset(asset: ThemeAssetDescriptor): Promise<never> {
    throw new ThemeAssetProviderError(
      "ThemeAssetProviderUnconfigured",
      `No theme asset provider configured for ${asset.asset_code}`,
    );
  }
}

export class OpenAiCompatibleThemeAssetProvider implements ThemeAssetProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAiCompatibleThemeAssetProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async generateAsset(asset: ThemeAssetDescriptor): Promise<ThemeAssetProviderResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(createImageRequest(this.model, asset)),
    });

    if (!response.ok) {
      throw new ThemeAssetProviderError("ThemeAssetProviderRequestFailed", `Image provider failed: ${response.status}`);
    }

    return {
      assetCode: asset.asset_code,
      uri: readGeneratedImageUri(await response.json()),
      provider: "openai-compatible-image",
      metadata: { model: this.model, kind: asset.kind },
    };
  }
}

export function createThemeAssetProviderFromEnv(env: NodeJS.ProcessEnv): ThemeAssetProvider {
  if (!env.THEME_ASSET_PROVIDER || env.THEME_ASSET_PROVIDER === "unconfigured") {
    return new UnconfiguredThemeAssetProvider();
  }

  if (env.THEME_ASSET_PROVIDER === "openai-compatible") {
    return new OpenAiCompatibleThemeAssetProvider({
      baseUrl: readRequiredEnv(env, "THEME_ASSET_BASE_URL"),
      apiKey: readRequiredEnv(env, "THEME_ASSET_API_KEY"),
      model: readRequiredEnv(env, "THEME_ASSET_MODEL"),
    });
  }

  throw new Error("THEME_ASSET_PROVIDER must be openai-compatible or unconfigured");
}

function createImageRequest(model: string, asset: ThemeAssetDescriptor): Readonly<Record<string, unknown>> {
  return {
    model,
    prompt: formatAssetPrompt(asset),
    n: IMAGE_COUNT,
  };
}

function formatAssetPrompt(asset: ThemeAssetDescriptor): string {
  return `${asset.prompt}\nTheme motifs: ${asset.theme_motifs.join(", ")}`;
}

function readGeneratedImageUri(value: unknown): string {
  if (!isObjectRecord(value) || !Array.isArray(value.data)) {
    throw new ThemeAssetProviderError("ThemeAssetProviderInvalidResponse", "Image provider returned no data");
  }

  const firstImage = value.data[0];
  if (!isObjectRecord(firstImage) || typeof firstImage.url !== "string" || firstImage.url.length === 0) {
    throw new ThemeAssetProviderError("ThemeAssetProviderInvalidResponse", "Image provider returned no image url");
  }

  return firstImage.url;
}

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
