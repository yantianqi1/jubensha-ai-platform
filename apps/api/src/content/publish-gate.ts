import {
  analyzeScriptPackageFlow,
  analyzeScriptPackageTruthSupport,
  simulateScriptPackage,
  validateScriptPackageReferences,
  type ScriptPackage,
} from "@jubensha/dsl";

export interface PublishGateBlocker {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface PublishGateResult {
  readonly allowed: boolean;
  readonly blockers: readonly PublishGateBlocker[];
}

export class PublishGate {
  review(scriptPackage: ScriptPackage): PublishGateResult {
    const blockers = [
      ...validateScriptPackageReferences(scriptPackage),
      ...analyzeScriptPackageFlow(scriptPackage),
      ...analyzeScriptPackageTruthSupport(scriptPackage),
      ...simulateScriptPackage(scriptPackage).diagnostics,
    ].map((diagnostic) => ({
      code: diagnostic.code,
      path: diagnostic.path,
      message: diagnostic.message,
    }));

    return { allowed: blockers.length === 0, blockers };
  }
}
