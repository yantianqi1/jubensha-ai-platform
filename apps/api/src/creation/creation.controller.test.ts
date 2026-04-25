import { BadRequestException, RequestMethod } from "@nestjs/common";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { CreationOrchestrator } from "./creation-orchestrator.js";
import { CreationController } from "./creation.controller.js";
import { CreationService } from "./creation-service.js";

const ROOT_PATH = "creation";
const COMPILE_PATH = "story-bibles/compile-draft";
const GENERATE_PATH = "story-bibles/generate";

const storyBibleInput = {
  meta: {
    title: "雾港失踪案",
    genre: "mystery",
    player_count: 1,
    duration_minutes: 180,
    difficulty: "入门",
    supernatural_allowed: false,
  },
  theme: {
    premise: "港口宅邸内的一场离奇失踪。",
    theme_statement: "旧案会吞没人心。",
    tone: "冷峻悬疑",
  },
  truth: {
    core_case: "宅邸主人离奇失踪。",
    killer_or_core_secret: "管家伪造现场。",
    timeline: [{ id: "truth_1", title: "伪造", summary: "伪造现场。", actor_ids: ["butler"] }],
  },
  characters: [
    {
      id: "butler",
      name: "管家",
      public_profile: "沉默的宅邸管家。",
      private_secret: "知道真相。",
      goal: "保护秘密。",
      fear: "秘密曝光。",
      arc: "从沉默到崩溃。",
    },
  ],
  clues: [
    {
      id: "scratch",
      title: "划痕",
      content: "窗台划痕。",
      source_character_ids: ["butler"],
      red_herring: false,
    },
  ],
  acts: [
    { id: "act1", title: "初入宅邸", goal: "建立疑点。", scene_seeds: ["抵达宅邸。"] },
  ],
  endings: [
    { id: "truth", title: "真相", condition: "公开线索。", summary: "真相揭开。" },
  ],
};

describe("CreationController", () => {
  it("exposes compile draft route metadata", () => {
    const handler = CreationController.prototype.compileStoryBibleDraft;

    expect(Reflect.getMetadata(PATH_METADATA, CreationController)).toBe(ROOT_PATH);
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(COMPILE_PATH);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
  });

  it("exposes generate story bible route metadata", () => {
    const handler = CreationController.prototype.generateStoryBible;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(GENERATE_PATH);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
  });

  it("compiles story bible request bodies", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CreationController],
      providers: [
        {
          provide: CreationService,
          useValue: {
            createDraftFromStoryBible: async () => ({
              draftPackage: { id: "pkg_1" },
              flowDiagnostics: [],
              simulationDiagnostics: [],
            }),
          },
        },
        {
          provide: CreationOrchestrator,
          useValue: {
            generateStoryBible: async () => ({ storyBible: {}, criticDiagnostics: [], attempts: [] }),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(CreationController);

    await expect(
      controller.compileStoryBibleDraft({ storyBible: storyBibleInput }),
    ).resolves.toEqual({
      draftPackage: { id: "pkg_1" },
      flowDiagnostics: [],
      simulationDiagnostics: [],
    });
  });

  it("rejects bodies without storyBible", async () => {
    const controller = new CreationController({
      createDraftFromStoryBible: async () => ({
        draftPackage: { id: "pkg_1" },
        flowDiagnostics: [],
        simulationDiagnostics: [],
      }),
    } as CreationService, { generateStoryBible: async () => ({}) } as CreationOrchestrator);

    expect(() => controller.compileStoryBibleDraft({})).toThrow(BadRequestException);
  });

  it("passes structured generation requests to the orchestrator", async () => {
    let captured: unknown;
    const controller = new CreationController({} as CreationService, {
      async generateStoryBible(input) {
        captured = input;
        return { storyBible: { meta: { title: "ok" } }, criticDiagnostics: [], attempts: [] };
      },
    } as CreationOrchestrator);

    const result = await controller.generateStoryBible({
      premise: "雾港旧账",
      playerCount: 4,
      durationMinutes: 180,
      difficulty: "medium",
      genre: "mystery",
      tone: "阴冷",
    });

    expect(captured).toMatchObject({ premise: "雾港旧账", playerCount: 4 });
    expect(result).toEqual({ storyBible: { meta: { title: "ok" } }, criticDiagnostics: [], attempts: [] });
  });
});
