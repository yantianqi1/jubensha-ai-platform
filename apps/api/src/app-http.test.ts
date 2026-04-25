import { RequestMethod } from "@nestjs/common";
import {
  METHOD_METADATA,
  PATH_METADATA,
  REDIRECT_METADATA,
} from "@nestjs/common/constants";
import { beforeEach, describe, expect, it } from "vitest";
import { ContentService } from "./content/content-service.js";
import { createSequentialContentIdGenerator } from "./content/content-id-generator.js";
import { InMemoryContentRepository } from "./content/in-memory-content-repository.js";
import { PublishGate } from "./content/publish-gate.js";
import { DemoController } from "./demo/demo.controller.js";
import { HealthController } from "./health/health.controller.js";
import { HomeController } from "./home/home.controller.js";
import { RuntimeService } from "./runtime/runtime-service.js";
import { InMemoryRuntimeRepository } from "./runtime/in-memory-runtime-repository.js";
import { WebStaticController } from "./web-static/web-static.controller.js";

describe("Application HTTP entrypoints", () => {
  let demoController: DemoController;

  beforeEach(() => {
    const contentService = new ContentService({
      repository: new InMemoryContentRepository(),
      idGenerator: createSequentialContentIdGenerator(),
      publishGate: new PublishGate(),
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
    expect(Reflect.getMetadata(PATH_METADATA, WebStaticController)).toBe("/");
    expectRoute(WebStaticController, "getStudio", ["studio", "studio/"], RequestMethod.GET);
  });

  it("redirects the root entrypoint to Studio", () => {
    const redirect = Reflect.getMetadata(REDIRECT_METADATA, HomeController.prototype.getHome);

    expect(redirect).toEqual({ statusCode: 302, url: "/studio/" });
  });

  it("renders the built Studio static page", async () => {
    const html = await new WebStaticController().getStudio();

    expect(html).toContain('data-surface-shell="studio-web"');
    expect(html).toContain('src="/app.js"');
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
  path: string | readonly string[] | undefined,
  requestMethod: RequestMethod,
): void {
  const handler = controller.prototype[methodName];

  expect(Reflect.getMetadata(PATH_METADATA, handler)).toEqual(path);
  expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(requestMethod);
}
