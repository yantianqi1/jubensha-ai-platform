import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Headers,
  UseFilters,
} from "@nestjs/common";
import { ContentService } from "./content-service.js";
import { ContentHttpErrorFilter } from "./content-http-error.filter.js";
import { AuditService } from "../audit/audit-service.js";
import { readRequestId, requireOperator, type RequestHeaders } from "../identity/request-identity.js";

@UseFilters(ContentHttpErrorFilter)
@Controller("content")
export class ContentController {
  constructor(
    @Inject(ContentService) private readonly contentService: ContentService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

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
  async publishDraft(
    @Param("packageId") packageId: string,
    @Body() body: unknown,
    @Headers() headers: RequestHeaders,
  ) {
    const actor = requireOperator(headers);
    const requestId = readRequestId(headers);

    try {
      const version = await this.contentService.publishDraft(packageId, readSemver(body));
      await this.auditService.record({
        action: "publish_draft",
        actor,
        targetType: "package",
        targetId: packageId,
        status: "succeeded",
        ...optionalRequestId(requestId),
      });
      return version;
    } catch (error) {
      await this.auditService.record({
        action: "publish_draft",
        actor,
        targetType: "package",
        targetId: packageId,
        status: "failed",
        ...optionalRequestId(requestId),
        errorCode: readErrorCode(error),
      });
      throw error;
    }
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

function readErrorCode(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function optionalRequestId(requestId: string | undefined): { readonly requestId?: string } {
  return requestId ? { requestId } : {};
}
