import {
  HttpStatus,
  RequestMethod,
  type ArgumentsHost,
} from "@nestjs/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { ContentController } from "./content.controller.js";
import { ContentValidationError } from "./content-errors.js";
import { ContentHttpErrorFilter } from "./content-http-error.filter.js";
import {
  createSequentialContentIdGenerator,
  type ContentIdGenerator,
} from "./content-id-generator.js";
import type { ContentRepository } from "./content-repository.js";
import { ContentService } from "./content-service.js";
import {
  CONTENT_ID_GENERATOR,
  CONTENT_REPOSITORY,
} from "./content.tokens.js";
import { InMemoryContentRepository } from "./in-memory-content-repository.js";

const ROOT_PATH = "content";
const PACKAGE_PATH = "packages";
const PACKAGE_DETAIL_PATH = "packages/:packageId";
const PACKAGE_DRAFT_PATH = "packages/:packageId/draft";
const PUBLISH_PATH = "packages/:packageId/publish";
const VERSION_PATH = "versions/:versionId";

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

describe("Content HTTP entrypoints", () => {
  let controller: ContentController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: CONTENT_REPOSITORY,
          useFactory: () => new InMemoryContentRepository(),
        },
        {
          provide: CONTENT_ID_GENERATOR,
          useFactory: createSequentialContentIdGenerator,
        },
        {
          provide: ContentService,
          inject: [CONTENT_REPOSITORY, CONTENT_ID_GENERATOR],
          useFactory: (
            repository: ContentRepository,
            idGenerator: ContentIdGenerator,
          ) =>
            new ContentService({
              repository,
              idGenerator,
            }),
        },
      ],
    }).compile();

    controller = moduleRef.get(ContentController);
  });

  it("exposes REST route metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ContentController)).toBe(ROOT_PATH);
    expectRoute("createDraftPackage", PACKAGE_PATH, RequestMethod.POST);
    expectRoute("listPackages", PACKAGE_PATH, RequestMethod.GET);
    expectRoute("getPackage", PACKAGE_DETAIL_PATH, RequestMethod.GET);
    expectRoute("updateDraftPackage", PACKAGE_DRAFT_PATH, RequestMethod.PATCH);
    expectRoute("publishDraft", PUBLISH_PATH, RequestMethod.POST);
    expectRoute("getReleasedVersion", VERSION_PATH, RequestMethod.GET);
    expectRoute("updateReleasedVersion", VERSION_PATH, RequestMethod.PATCH);
  });

  it("creates and retrieves a draft package", async () => {
    const created = await controller.createDraftPackage(validPackageInput);

    expect(created.id).toMatch(/^pkg_/);
    expect(created.currentDraft.content.title).toBe("雾港失踪案");
    await expect(controller.getPackage(created.id)).resolves.toEqual(created);
  });

  it("lists draft packages", async () => {
    const created = await controller.createDraftPackage(validPackageInput);

    await expect(controller.listPackages()).resolves.toEqual([created]);
  });

  it("returns validation diagnostics for invalid package references", async () => {
    await expect(
      controller.createDraftPackage({
        ...validPackageInput,
        clues: [],
      }),
    ).rejects.toMatchObject({
      diagnostics: [
        {
          severity: "error",
          code: "missing_clue",
          path: "scenes.act1.actions.inspect_window.effect[0].clue_code",
          message: "Missing clue reference: C-01",
        },
      ],
    });
  });

  it("publishes a draft package", async () => {
    const created = await controller.createDraftPackage(validPackageInput);
    const version = await controller.publishDraft(created.id, { semver: "1.0.0" });

    expect(version.id).toMatch(/^ver_/);
    expect(version.semver).toBe("1.0.0");
    expect(version.state).toBe("released");
  });

  it("updates draft package content", async () => {
    const created = await controller.createDraftPackage(validPackageInput);

    const updated = await controller.updateDraftPackage(created.id, {
      ...validPackageInput,
      title: "雾港续案",
    });

    expect(updated.currentDraft.content.title).toBe("雾港续案");
    await expect(controller.getPackage(created.id)).resolves.toEqual(updated);
  });

  it("loads a released version", async () => {
    const created = await controller.createDraftPackage(validPackageInput);
    const version = await controller.publishDraft(created.id, { semver: "1.0.0" });

    await expect(controller.getReleasedVersion(version.id)).resolves.toEqual(version);
  });

  it("maps validation errors to bad request responses", () => {
    const response = createJsonResponse();
    const host = createArgumentsHost(response);
    const error = new ContentValidationError("Invalid package", []);

    new ContentHttpErrorFilter().catch(error, host);

    expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({
      error: "ContentValidationError",
      message: "Invalid package",
      diagnostics: [],
    });
  });
});

function expectRoute(
  methodName: keyof ContentController,
  path: string,
  requestMethod: RequestMethod,
): void {
  const handler = ContentController.prototype[methodName];

  expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
  expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(requestMethod);
}

function createJsonResponse() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json(body: unknown) {
      this.body = body;
    },
  };
}

function createArgumentsHost(response: ReturnType<typeof createJsonResponse>): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
    }),
  } as ArgumentsHost;
}
