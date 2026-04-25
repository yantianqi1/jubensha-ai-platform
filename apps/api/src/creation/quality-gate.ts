import {
  analyzeScriptPackageFlow,
  analyzeScriptPackageTruthSupport,
  parseScriptPackage,
  simulateScriptPackage,
  validateScriptPackageReferences,
  type ScriptPackage,
} from "@jubensha/dsl";

export type QualityGateSeverity = "info" | "warning" | "error";

export interface QualityGateDiagnostic {
  readonly severity: QualityGateSeverity;
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface QualityGateSummary {
  readonly readyForPublish: boolean;
  readonly diagnostics: readonly QualityGateDiagnostic[];
  readonly summary: QualityGateDiagnosticSummary;
  readonly report: QualityGateReport;
}

export interface QualityGateReport {
  readonly headline: string;
  readonly readinessLabel: "ready" | "blocked";
  readonly sections: readonly string[];
}

export interface QualityGateDiagnosticSummary {
  readonly errors: number;
  readonly warnings: number;
  readonly info: number;
}

export class QualityGate {
  reviewPackage(input: unknown): QualityGateSummary {
    const parsed = parsePackageForReview(input);

    if (!parsed.ok) {
      const diagnostics = [parsed.diagnostic];

      return {
        readyForPublish: false,
        diagnostics,
        summary: summarizeDiagnostics(diagnostics),
        report: buildQualityGateReport(diagnostics),
      };
    }

    const diagnostics = collectPackageDiagnostics(parsed.package);
    const readyForPublish = !diagnostics.some((diagnostic) => diagnostic.severity === "error");

    return {
      readyForPublish,
      diagnostics,
      summary: summarizeDiagnostics(diagnostics),
      report: buildQualityGateReport(diagnostics),
    };
  }
}

function parsePackageForReview(input: unknown):
  | { readonly ok: true; readonly package: ScriptPackage }
  | { readonly ok: false; readonly diagnostic: QualityGateDiagnostic } {
  try {
    return { ok: true, package: parseScriptPackage(input) };
  } catch (error) {
    return { ok: false, diagnostic: createSchemaDiagnostic(error) };
  }
}

function collectPackageDiagnostics(scriptPackage: ScriptPackage): readonly QualityGateDiagnostic[] {
  return [
    ...validateScriptPackageReferences(scriptPackage),
    ...analyzeScriptPackageFlow(scriptPackage),
    ...analyzeScriptPackageTruthSupport(scriptPackage),
    ...simulateScriptPackage(scriptPackage).diagnostics,
    ...readReleaseDiagnostics(scriptPackage),
  ].map(toQualityDiagnostic);
}

function readReleaseDiagnostics(scriptPackage: ScriptPackage): readonly QualityGateDiagnostic[] {
  if (scriptPackage.status === "draft") {
    return [];
  }

  return scriptPackage.semver ? [] : [
    {
      severity: "error",
      code: "release_semver_required",
      path: "semver",
      message: "Released packages must declare semver before publish review.",
    },
  ];
}

function toQualityDiagnostic(diagnostic: QualityGateDiagnostic): QualityGateDiagnostic {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    path: diagnostic.path,
    message: diagnostic.message,
  };
}

function createSchemaDiagnostic(error: unknown): QualityGateDiagnostic {
  if (isReleasedPackageSemverError(error)) {
    return {
      severity: "error",
      code: "release_semver_required",
      path: "semver",
      message: "Released packages must declare semver before publish review.",
    };
  }

  return {
    severity: "error",
    code: "invalid_script_package",
    path: "$",
    message: error instanceof Error ? error.message : "Script package schema validation failed.",
  };
}

function isReleasedPackageSemverError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("released package requires semver");
}

function summarizeDiagnostics(
  diagnostics: readonly QualityGateDiagnostic[],
): QualityGateDiagnosticSummary {
  return diagnostics.reduce(
    (summary, diagnostic) => {
      if (diagnostic.severity === "error") {
        return { ...summary, errors: summary.errors + 1 };
      }

      if (diagnostic.severity === "warning") {
        return { ...summary, warnings: summary.warnings + 1 };
      }

      return { ...summary, info: summary.info + 1 };
    },
    { errors: 0, warnings: 0, info: 0 },
  );
}

function buildQualityGateReport(diagnostics: readonly QualityGateDiagnostic[]): QualityGateReport {
  const summary = summarizeDiagnostics(diagnostics);
  const readinessLabel = summary.errors > 0 ? "blocked" : "ready";

  return {
    headline: buildReportHeadline(summary),
    readinessLabel,
    sections: [formatSummarySection(summary), ...diagnostics.map(formatDiagnosticSection)],
  };
}

function buildReportHeadline(summary: QualityGateDiagnosticSummary): string {
  if (summary.errors > 0) {
    return `预发布检查未通过：${summary.errors} 个阻断项`;
  }

  if (summary.warnings > 0) {
    return `预发布检查通过但有 ${summary.warnings} 个警告`;
  }

  return "预发布检查通过";
}

function formatSummarySection(summary: QualityGateDiagnosticSummary): string {
  return `Errors: ${summary.errors} / Warnings: ${summary.warnings} / Info: ${summary.info}`;
}

function formatDiagnosticSection(diagnostic: QualityGateDiagnostic): string {
  return `[${diagnostic.severity}] ${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`;
}
