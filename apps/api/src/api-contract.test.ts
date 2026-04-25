import { describe, expect, it } from "vitest";
import {
  apiContractRoutes,
  discoverApiSurfaceRoutes,
  listApiContractRoutes,
} from "./api-contract.js";

describe("api contract routes", () => {
  it("keeps Studio creation endpoints explicit", () => {
    expect(listApiContractRoutes("creation").map((route) => route.path)).toEqual([
      "/creation/story-bibles/generate",
      "/creation/generation-jobs",
      "/creation/generation-jobs/:jobId",
      "/creation/generation-jobs/:jobId/run",
      "/creation/generation-jobs/:jobId/events",
      "/creation/story-bibles/compile-draft",
      "/creation/theme-assets/compile",
      "/creation/theme-assets/jobs",
      "/creation/theme-assets/jobs/:jobId",
      "/creation/theme-assets/jobs/:jobId/run",
    ]);
  });

  it("declares explicit theme asset routes without provider completion", () => {
    expect(apiContractRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "creation",
          method: "POST",
          path: "/creation/theme-assets/compile",
          success: "ThemeAssetManifest",
          errors: ["InvalidRequest", "StoryBibleValidationError"],
        }),
        expect.objectContaining({
          surface: "creation",
          method: "POST",
          path: "/creation/theme-assets/jobs",
          success: "ThemeAssetJobRecord",
          errors: ["InvalidRequest", "StoryBibleValidationError"],
        }),
        expect.objectContaining({
          surface: "creation",
          method: "GET",
          path: "/creation/theme-assets/jobs/:jobId",
          success: "ThemeAssetJobRecord",
          errors: ["ThemeAssetJobNotFoundError"],
        }),
        expect.objectContaining({
          surface: "creation",
          method: "POST",
          path: "/creation/theme-assets/jobs/:jobId/run",
          success: "ThemeAssetJobRecord",
          errors: ["ThemeAssetJobNotFoundError", "ThemeAssetJobConflictError", "IdentityRequired", "IdentityMismatch"],
        }),
      ]),
    );
  });

  it("declares review and runtime boundaries", () => {
    expect(apiContractRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ surface: "review", path: "/creation/publish-review/packages/:packageId" }),
        expect.objectContaining({ surface: "review", path: "/creation/review-workbench/packages/:packageId" }),
        expect.objectContaining({ surface: "runtime", path: "/runtime/rooms/:roomId/actions" }),
        expect.objectContaining({ surface: "runtime", path: "/runtime/rooms/:roomId/snapshot" }),
        expect.objectContaining({ surface: "runtime", path: "/runtime/rooms/:roomId/seats/:seatId/snapshot" }),
        expect.objectContaining({ surface: "runtime", path: "/runtime/rooms/:roomId/events" }),
      ]),
    );
  });

  it("declares browser-used demo and generation routes", () => {
    expect(apiContractRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ surface: "demo", path: "/demo/fog-harbor" }),
        expect.objectContaining({ surface: "generation", path: "/generation/rooms/:roomId/npc/:npcCode/ask" }),
        expect.objectContaining({ surface: "audit", path: "/audit/events" }),
      ]),
    );
  });

  it("declares content package and version routes", () => {
    expect(listApiContractRoutes("content").map((route) => `${route.method} ${route.path}`)).toEqual([
      "POST /content/packages",
      "GET /content/packages",
      "GET /content/packages/:packageId",
      "PATCH /content/packages/:packageId/draft",
      "POST /content/packages/:packageId/publish",
      "GET /content/versions/:versionId",
      "PATCH /content/versions/:versionId",
    ]);
  });

  it("uses structured error names emitted by route filters", () => {
    expect(apiContractRoutes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/content/packages",
          errors: ["InvalidRequest", "ContentValidationError"],
        }),
        expect.objectContaining({
          path: "/content/packages/:packageId",
          errors: ["ContentNotFoundError"],
        }),
        expect.objectContaining({
          path: "/content/versions/:versionId",
          errors: ["ContentNotFoundError"],
        }),
        expect.objectContaining({
          path: "/content/packages/:packageId/publish",
          errors: ["InvalidRequest", "ContentNotFoundError", "ContentValidationError", "ContentPublishBlockedError", "IdentityRequired", "IdentityMismatch"],
        }),
        expect.objectContaining({
          path: "/runtime/rooms/:roomId/actions",
          errors: ["InvalidRequest", "RuntimeConflictError", "RuntimeNotFoundError", "RuntimeRuleError", "IdentityRequired", "IdentityMismatch"],
        }),
      ]),
    );
  });

  it("discovers routes grouped by API surface", () => {
    expect(discoverApiSurfaceRoutes()).toEqual([
      expect.objectContaining({ surface: "creation", routeCount: 10 }),
      expect.objectContaining({ surface: "review", routeCount: 2 }),
      expect.objectContaining({ surface: "runtime", routeCount: 10 }),
      expect.objectContaining({ surface: "content", routeCount: 7 }),
      expect.objectContaining({ surface: "demo", routeCount: 1 }),
      expect.objectContaining({ surface: "generation", routeCount: 1 }),
      expect.objectContaining({ surface: "audit", routeCount: 1 }),
    ]);
  });
});
