import { describe, expect, it } from "vitest";
import { ThemeAssetProviderError, UnconfiguredThemeAssetProvider } from "./theme-asset-provider.js";

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
});
