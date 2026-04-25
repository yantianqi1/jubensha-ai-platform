import { describe, expect, it } from "vitest";
import {
  compareGoldenPackage,
  goldenPackages,
  runGoldenPackageRegression,
  summarizeGoldenPackageRegression,
} from "./golden-packages.js";

const [golden] = goldenPackages;

describe("golden packages", () => {
  it("keeps explicit named regression fixtures", () => {
    expect(golden?.name).toBe("fog-harbor-demo");
    expect(golden?.package.package_code).toBe("fog_harbor");
  });

  it("passes built-in fixtures through quality review", () => {
    const results = runGoldenPackageRegression();

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: "fog-harbor-demo", matched: true });
    expect(results[0]?.quality.readyForPublish).toBe(true);
  });

  it("reports package contract differences", () => {
    const changed = { ...golden!.package, title: "Changed" };

    expect(compareGoldenPackage(golden!.package, changed)).toEqual([
      "title: expected 雾港失踪案, received Changed",
    ]);
  });

  it("summarizes golden regression failures for publish review", () => {
    const changed = { ...golden!.package, title: "Changed" };
    const results = runGoldenPackageRegression({ "fog-harbor-demo": changed });

    expect(summarizeGoldenPackageRegression(results)).toEqual({
      passed: false,
      total: 1,
      failed: 1,
      failures: [
        {
          name: "fog-harbor-demo",
          differences: ["title: expected 雾港失踪案, received Changed"],
          qualityReadyForPublish: true,
        },
      ],
    });
  });
});
