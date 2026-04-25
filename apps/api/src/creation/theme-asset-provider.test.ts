import { describe, expect, it } from "vitest";
import {
  OpenAiCompatibleThemeAssetProvider,
  ThemeAssetProviderError,
  UnconfiguredThemeAssetProvider,
  createThemeAssetProviderFromEnv,
} from "./theme-asset-provider.js";

describe("UnconfiguredThemeAssetProvider", () => {
  it("fails explicitly instead of pretending success", async () => {
    const provider = new UnconfiguredThemeAssetProvider();

    await expect(provider.generateAsset({ asset_code: "cover", kind: "cover", prompt: "p", theme_motifs: ["m"] })).rejects.toMatchObject({
      name: "ThemeAssetProviderError",
      code: "ThemeAssetProviderUnconfigured",
    });
  });

  it("formats provider errors with explicit code", () => {
    const error = new ThemeAssetProviderError("ProviderDown", "offline");

    expect(error.code).toBe("ProviderDown");
    expect(error.message).toBe("offline");
  });

  it("keeps the default provider explicitly unconfigured", async () => {
    const provider = createThemeAssetProviderFromEnv({});

    await expect(provider.generateAsset({ asset_code: "cover", kind: "cover", prompt: "p", theme_motifs: ["m"] })).rejects.toMatchObject({
      code: "ThemeAssetProviderUnconfigured",
    });
  });

  it("posts image generation requests to a configured OpenAI compatible endpoint", async () => {
    const requests: Array<{ readonly url: string; readonly init: RequestInit }> = [];
    const provider = new OpenAiCompatibleThemeAssetProvider({
      baseUrl: "https://image-provider.test/v1/",
      apiKey: "asset-key",
      model: "image-model",
      fetch: async (url, init) => {
        requests.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ data: [{ url: "https://cdn.test/cover.png" }] }), { status: 200 });
      },
    });

    const result = await provider.generateAsset({
      asset_code: "cover",
      kind: "cover",
      prompt: "雾港封面",
      theme_motifs: ["fog", "harbor"],
    });

    expect(result).toEqual({
      assetCode: "cover",
      uri: "https://cdn.test/cover.png",
      provider: "openai-compatible-image",
      metadata: { model: "image-model", kind: "cover" },
    });
    expect(requests[0]?.url).toBe("https://image-provider.test/v1/images/generations");
    expect(requests[0]?.init.headers).toMatchObject({ authorization: "Bearer asset-key" });
    expect(JSON.parse(String(requests[0]?.init.body))).toMatchObject({
      model: "image-model",
      prompt: "雾港封面\nTheme motifs: fog, harbor",
      n: 1,
    });
  });

  it("throws explicit errors when the image provider env is incomplete", () => {
    expect(() => createThemeAssetProviderFromEnv({ THEME_ASSET_PROVIDER: "openai-compatible" })).toThrow(
      "THEME_ASSET_BASE_URL is required",
    );
  });
});
