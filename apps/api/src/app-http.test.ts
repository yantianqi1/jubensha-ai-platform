import { RequestMethod } from "@nestjs/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
} from "@nestjs/common/constants";
import { beforeEach, describe, expect, it } from "vitest";
import { ContentService } from "./content/content-service.js";
import { createSequentialContentIdGenerator } from "./content/content-id-generator.js";
import { InMemoryContentRepository } from "./content/in-memory-content-repository.js";
import { DemoController } from "./demo/demo.controller.js";
import { HealthController } from "./health/health.controller.js";
import { HomeController } from "./home/home.controller.js";
import { RuntimeService } from "./runtime/runtime-service.js";
import { InMemoryRuntimeRepository } from "./runtime/in-memory-runtime-repository.js";

describe("Application HTTP entrypoints", () => {
  let demoController: DemoController;

  beforeEach(() => {
    const contentService = new ContentService({
      repository: new InMemoryContentRepository(),
      idGenerator: createSequentialContentIdGenerator(),
    });
    const runtimeService = new RuntimeService({
      repository: new InMemoryRuntimeRepository(),
      idGenerator: () => "room_1",
      versionReader: contentService,
    });

    demoController = new DemoController(contentService, runtimeService);
  });

  it("exposes health and demo route metadata", () => {
    expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe("health");
    expectRoute(HealthController, "getHealth", "/", RequestMethod.GET);
    expect(Reflect.getMetadata(PATH_METADATA, DemoController)).toBe("demo");
    expectRoute(DemoController, "runFogHarbor", "fog-harbor", RequestMethod.POST);
    expect(Reflect.getMetadata(PATH_METADATA, HomeController)).toBe("/");
    expectRoute(HomeController, "getHome", "/", RequestMethod.GET);
  });

  it("renders a browser-visible MVP home page", () => {
    const html = new HomeController().getHome();

    expect(html).toContain("剧本杀游戏平台 MVP");
    expect(html).toContain("/demo/fog-harbor");
  });

  it("runs a complete content publish and runtime action demo", async () => {
    const result = await demoController.runFogHarbor();

    expect(result.packageId).toBe("pkg_1");
    expect(result.versionId).toBe("ver_1");
    expect(result.room.id).toBe("room_1");
    expect(result.room.state.revealedClues).toEqual(["C-01"]);
    expect(result.room.events).toHaveLength(1);
  });
});

function expectRoute(
  controller: object,
  methodName: string,
  path: string | undefined,
  requestMethod: RequestMethod,
): void {
  const handler = controller.prototype[methodName];

  expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
  expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(requestMethod);
}
