import { describe, expect, it } from "vitest";
import {
  ContentConflictError,
  ContentNotFoundError,
  ContentPublishBlockedError,
  ContentValidationError,
} from "./content-errors.js";
import { ContentService } from "./content-service.js";
import { InMemoryContentRepository } from "./in-memory-content-repository.js";
import { PublishGate } from "./publish-gate.js";

const validPackageInput = {
  package_code: "fog_harbor",
  title: "雾港失踪案",
  status: "draft" as const,
  roles: [
    {
      role_code: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家。",
    },
  ],
  clues: [
    {
      clue_code: "C-01",
      title: "窗台划痕",
      content: "窗台上有一道新鲜划痕。",
      initial_visibility: [{ kind: "public" as const, value: "all" }],
      unlock_if: [],
    },
  ],
  meta: { summary: "用于发布测试。", tags: [], player_count: 1, truth: "窗台划痕揭示真相。" },
  scenes: [
    {
      scene_code: "act1",
      phase: "investigation" as const,
      visible_to: [{ kind: "public" as const, value: "all" }],
      actions: [
        {
          code: "inspect_window",
          allow_if: [],
          effect: [{ type: "reveal_clue" as const, clue_code: "C-01" }],
        },
      ],
      end_if: [{ op: "timer_expired" as const }],
      entry_if: [],
      win_rule_hooks: [],
    },
  ],
};

function createService(): ContentService {
  return new ContentService({
    repository: new InMemoryContentRepository(),
    idGenerator: (kind) => `${kind}-id-1`,
    publishGate: new PublishGate(),
  });
}

describe("ContentService", () => {
  it("creates a draft package and stores parsed content", async () => {
    const service = createService();

    const created = await service.createDraftPackage(validPackageInput);

    expect(created.id).toBe("package-id-1");
    expect(created.currentDraft.content.title).toBe("雾港失踪案");
    await expect(service.getPackage("package-id-1")).resolves.toEqual(created);
  });

  it("lists saved script packages", async () => {
    const service = createService();
    const created = await service.createDraftPackage(validPackageInput);

    await expect(service.listPackages()).resolves.toEqual([created]);
  });

  it("throws validation error for invalid package content", async () => {
    const service = createService();

    await expect(
      service.createDraftPackage({
        ...validPackageInput,
        roles: [],
      }),
    ).rejects.toBeInstanceOf(ContentValidationError);
  });

  it("rejects released content when creating a draft", async () => {
    const service = createService();

    await expect(
      service.createDraftPackage({
        ...validPackageInput,
        status: "released",
        semver: "1.0.0",
      }),
    ).rejects.toBeInstanceOf(ContentValidationError);
  });

  it("throws validation error for package reference diagnostics", async () => {
    const service = createService();

    await expect(
      service.createDraftPackage({
        ...validPackageInput,
        clues: [],
      }),
    ).rejects.toMatchObject({
      diagnostics: [
        {
          code: "missing_clue",
          path: "scenes.act1.actions.inspect_window.effect[0].clue_code",
        },
      ],
    });
  });

  it("publishes a draft into an immutable version", async () => {
    const service = createService();
    await service.createDraftPackage(validPackageInput);

    const version = await service.publishDraft("package-id-1", "1.0.0");
    const stored = await service.getPackage("package-id-1");

    expect(version.semver).toBe("1.0.0");
    expect(version.state).toBe("released");
    expect(stored.releasedVersions).toEqual([version]);
  });


  it("blocks publishing drafts with quality blockers", async () => {
    const service = createService();
    await service.createDraftPackage({ ...validPackageInput, meta: undefined });

    await expect(service.publishDraft("package-id-1", "1.0.0")).rejects.toMatchObject({
      name: "ContentPublishBlockedError",
      blockers: [{ code: "not_evaluable", path: "meta.truth" }],
    });
  });

  it("updates draft package content without changing released versions", async () => {
    const service = createService();
    await service.createDraftPackage(validPackageInput);
    const version = await service.publishDraft("package-id-1", "1.0.0");

    const updated = await service.updateDraftPackage("package-id-1", {
      ...validPackageInput,
      title: "雾港续案",
    });

    expect(updated.currentDraft.content.title).toBe("雾港续案");
    expect(updated.releasedVersions).toEqual([version]);
  });

  it("rejects released content when updating a draft", async () => {
    const service = createService();
    await service.createDraftPackage(validPackageInput);

    await expect(
      service.updateDraftPackage("package-id-1", {
        ...validPackageInput,
        status: "released",
        semver: "1.0.0",
      }),
    ).rejects.toBeInstanceOf(ContentValidationError);
  });

  it("loads a released version by id", async () => {
    const service = createService();
    await service.createDraftPackage(validPackageInput);
    const version = await service.publishDraft("package-id-1", "1.0.0");

    await expect(service.getReleasedVersion(version.id)).resolves.toEqual(version);
  });

  it("throws not found for missing released version", async () => {
    const service = createService();

    await expect(service.getReleasedVersion("missing-version")).rejects.toBeInstanceOf(
      ContentNotFoundError,
    );
  });

  it("rejects updating a published version", async () => {
    const service = createService();
    await service.createDraftPackage(validPackageInput);
    const version = await service.publishDraft("package-id-1", "1.0.0");

    await expect(service.updateReleasedVersion(version.id, validPackageInput)).rejects.toBeInstanceOf(
      ContentConflictError,
    );
  });
});
