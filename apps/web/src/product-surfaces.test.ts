import { describe, expect, it } from "vitest";
import {
  getProductSurfaceRoute,
  productSurfaceRoutes,
  resolveProductSurfaceIdFromPath,
} from "./product-surfaces.js";

describe("product surface routes", () => {
  it("declares studio play and admin route boundaries", () => {
    expect(productSurfaceRoutes.map((surface) => surface.id)).toEqual([
      "studio-web",
      "play-web",
      "admin-web",
    ]);
    expect(getProductSurfaceRoute("studio-web").apiScopes).toEqual(["creation", "content"]);
    expect(getProductSurfaceRoute("play-web").basePath).toBe("/play");
    expect(getProductSurfaceRoute("admin-web").apiScopes).toContain("creation/review-workbench");
  });

  it("resolves the active surface from a pathname", () => {
    expect(resolveProductSurfaceIdFromPath("/")).toBe("play-web");
    expect(resolveProductSurfaceIdFromPath("/studio"))
      .toBe("studio-web");
    expect(resolveProductSurfaceIdFromPath("/admin/health")).toBe("admin-web");
  });
});
