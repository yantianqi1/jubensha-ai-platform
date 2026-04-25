import { Injectable } from "@nestjs/common";
import type { ThemeAssetDescriptor } from "@jubensha/dsl";

export const THEME_ASSET_PROVIDER = Symbol("THEME_ASSET_PROVIDER");

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
