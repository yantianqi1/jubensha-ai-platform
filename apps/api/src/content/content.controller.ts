import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseFilters,
} from "@nestjs/common";
import { ContentService } from "./content-service.js";
import { ContentHttpErrorFilter } from "./content-http-error.filter.js";

@UseFilters(ContentHttpErrorFilter)
@Controller("content")
export class ContentController {
  constructor(@Inject(ContentService) private readonly contentService: ContentService) {}

  @Post("packages")
  createDraftPackage(@Body() body: unknown) {
    return this.contentService.createDraftPackage(body);
  }

  @Get("packages")
  listPackages() {
    return this.contentService.listPackages();
  }

  @Get("packages/:packageId")
  getPackage(@Param("packageId") packageId: string) {
    return this.contentService.getPackage(packageId);
  }

  @Patch("packages/:packageId/draft")
  updateDraftPackage(@Param("packageId") packageId: string, @Body() body: unknown) {
    return this.contentService.updateDraftPackage(packageId, body);
  }

  @Post("packages/:packageId/publish")
  publishDraft(@Param("packageId") packageId: string, @Body() body: unknown) {
    return this.contentService.publishDraft(packageId, readSemver(body));
  }

  @Get("versions/:versionId")
  getReleasedVersion(@Param("versionId") versionId: string) {
    return this.contentService.getReleasedVersion(versionId);
  }

  @Patch("versions/:versionId")
  updateReleasedVersion(@Param("versionId") versionId: string, @Body() body: unknown) {
    return this.contentService.updateReleasedVersion(versionId, body);
  }
}

function readSemver(body: unknown): string {
  if (!isObjectRecord(body) || typeof body.semver !== "string") {
    throw new BadRequestException({
      error: "InvalidRequest",
      message: "semver is required",
    });
  }

  return body.semver;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
