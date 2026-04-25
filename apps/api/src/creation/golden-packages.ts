import type { ScriptPackage } from "@jubensha/dsl";
import { fogHarborDemoPackage } from "../demo/demo-package.js";
import { QualityGate, type QualityGateSummary } from "./quality-gate.js";

export interface GoldenPackageEntry {
  readonly name: string;
  readonly package: ScriptPackage;
}

export interface GoldenRegressionResult {
  readonly name: string;
  readonly matched: boolean;
  readonly quality: QualityGateSummary;
  readonly differences: readonly string[];
}

export interface GoldenRegressionFailureSummary {
  readonly name: string;
  readonly differences: readonly string[];
  readonly qualityReadyForPublish: boolean;
}

export interface GoldenRegressionSummary {
  readonly passed: boolean;
  readonly total: number;
  readonly failed: number;
  readonly failures: readonly GoldenRegressionFailureSummary[];
}

export const goldenPackages: readonly GoldenPackageEntry[] = [
  { name: "fog-harbor-demo", package: fogHarborDemoPackage },
];

export function runGoldenPackageRegression(
  candidates: Readonly<Record<string, ScriptPackage>> = {},
): readonly GoldenRegressionResult[] {
  const gate = new QualityGate();

  return goldenPackages.map((entry) => {
    const candidate = candidates[entry.name] ?? entry.package;

    return {
      name: entry.name,
      matched: compareGoldenPackage(entry.package, candidate).length === 0,
      quality: gate.reviewPackage(candidate),
      differences: compareGoldenPackage(entry.package, candidate),
    };
  });
}

export function compareGoldenPackage(
  expected: ScriptPackage,
  actual: ScriptPackage,
): readonly string[] {
  return [
    ...compareField("package_code", expected.package_code, actual.package_code),
    ...compareField("title", expected.title, actual.title),
    ...compareField("roles", expected.roles.length, actual.roles.length),
    ...compareField("clues", expected.clues.length, actual.clues.length),
    ...compareField("scenes", expected.scenes.length, actual.scenes.length),
  ];
}

function compareField(path: string, expected: unknown, actual: unknown): readonly string[] {
  return Object.is(expected, actual) ? [] : [`${path}: expected ${expected}, received ${actual}`];
}

export function summarizeGoldenPackageRegression(
  results: readonly GoldenRegressionResult[] = runGoldenPackageRegression(),
): GoldenRegressionSummary {
  const failures = results.filter((result) => !result.matched);

  return {
    passed: failures.length === 0,
    total: results.length,
    failed: failures.length,
    failures: failures.map((result) => ({
      name: result.name,
      differences: result.differences,
      qualityReadyForPublish: result.quality.readyForPublish,
    })),
  };
}
