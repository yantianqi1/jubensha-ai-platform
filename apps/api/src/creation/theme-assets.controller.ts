import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { parseStoryBible } from "@jubensha/dsl";
import { compileThemeAssets as compileThemeAssetManifest } from "./theme-asset-compiler.js";

@Controller("creation/theme-assets")
export class ThemeAssetsController {
  @Post("compile")
  compileThemeAssets(@Body() body: unknown) {
    const storyBible = parseStoryBible(readStoryBible(body));

    return compileThemeAssetManifest(storyBible);
  }
}

function readStoryBible(body: unknown): unknown {
  if (!isObjectRecord(body) || !("storyBible" in body)) {
    throw new BadRequestException({
      error: "InvalidRequest",
      message: "storyBible is required",
    });
  }

  return body.storyBible;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
