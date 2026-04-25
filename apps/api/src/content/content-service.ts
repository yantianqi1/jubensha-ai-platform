import {
  parseScriptPackage,
  validateScriptPackageReferences,
  type ScriptPackage,
} from "@jubensha/dsl";
import {
  ContentConflictError,
  ContentNotFoundError,
  ContentPublishBlockedError,
  ContentValidationError,
} from "./content-errors.js";
import type {
  ContentRepository,
  ScriptPackageRecord,
  ScriptVersionRecord,
} from "./content-repository.js";
import type { ContentIdGenerator } from "./content-id-generator.js";
import type { PublishGate } from "./publish-gate.js";

export interface ContentServiceOptions {
  readonly repository: ContentRepository;
  readonly idGenerator: ContentIdGenerator;
  readonly publishGate: PublishGate;
}

export class ContentService {
  private readonly repository: ContentRepository;
  private readonly idGenerator: ContentIdGenerator;
  private readonly publishGate: PublishGate;

  constructor(options: ContentServiceOptions) {
    this.repository = options.repository;
    this.idGenerator = options.idGenerator;
    this.publishGate = options.publishGate;
  }

  async createDraftPackage(input: unknown): Promise<ScriptPackageRecord> {
    const content = parseAndValidateDraftPackage(input);
    const record: ScriptPackageRecord = {
      id: this.idGenerator("package"),
      currentDraft: { content },
      releasedVersions: [],
    };

    return this.repository.savePackage(record);
  }

  async listPackages(): Promise<readonly ScriptPackageRecord[]> {
    return this.repository.listPackages();
  }

  async updateDraftPackage(
    packageId: string,
    input: unknown,
  ): Promise<ScriptPackageRecord> {
    const record = await this.getPackage(packageId);
    const content = parseAndValidateDraftPackage(input);

    return this.repository.savePackage({
      ...record,
      currentDraft: { content },
    });
  }

  async getPackage(packageId: string): Promise<ScriptPackageRecord> {
    const record = await this.repository.findPackage(packageId);

    if (!record) {
      throw new ContentNotFoundError(`Script package not found: ${packageId}`);
    }

    return record;
  }

  async publishDraft(packageId: string, semver: string): Promise<ScriptVersionRecord> {
    const record = await this.getPackage(packageId);
    const content = parseAndValidatePackage({
      ...record.currentDraft.content,
      status: "released",
      semver,
    });
    const publishReview = this.publishGate.review(content);

    if (!publishReview.allowed) {
      throw new ContentPublishBlockedError("Draft package failed publish gate", publishReview.blockers);
    }

    const version: ScriptVersionRecord = {
      id: this.idGenerator("version"),
      semver,
      state: "released",
      content,
    };

    await this.repository.savePackage({
      ...record,
      releasedVersions: [...record.releasedVersions, version],
    });

    return version;
  }

  async getReleasedVersion(versionId: string): Promise<ScriptVersionRecord> {
    const version = await this.repository.findVersion(versionId);

    if (!version) {
      throw new ContentNotFoundError(`Script version not found: ${versionId}`);
    }

    return version;
  }

  async updateReleasedVersion(versionId: string, _input: unknown): Promise<never> {
    await this.getReleasedVersion(versionId);

    throw new ContentConflictError(`Released script version is immutable: ${versionId}`);
  }
}

function parseAndValidateDraftPackage(input: unknown): ScriptPackage {
  const content = parseAndValidatePackage(input);

  if (content.status !== "draft") {
    throw new ContentValidationError("Draft package content must have draft status", []);
  }

  return content;
}

function parseAndValidatePackage(input: unknown): ScriptPackage {
  try {
    const content = parseScriptPackage(input);
    const diagnostics = validateScriptPackageReferences(content);

    if (diagnostics.length > 0) {
      throw new ContentValidationError("Script package references are invalid", diagnostics);
    }

    return content;
  } catch (error) {
    if (error instanceof ContentValidationError) {
      throw error;
    }

    throw new ContentValidationError("Script package content is invalid", []);
  }
}
