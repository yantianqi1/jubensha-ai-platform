import { BadRequestException } from "@nestjs/common";
import {
  analyzeScriptPackageFlow,
  analyzeScriptPackageTruthSupport,
  simulateScriptPackage,
  validateStoryBibleReferences,
  type PackageFlowDiagnostic,
  type PackageSimulationDiagnostic,
  type ScriptPackage,
  type StoryBible,
} from "@jubensha/dsl";
import type { ScriptPackageRecord } from "../content/content-repository.js";
import { compileStoryBibleToScriptPackage } from "./story-bible-to-script-compiler.js";

export interface DraftPackageWriter {
  createDraftPackage(scriptPackage: ScriptPackage): Promise<ScriptPackageRecord>;
}

export interface CreationServiceOptions {
  readonly draftWriter: DraftPackageWriter;
}

export interface CreationDraftResult {
  readonly draftPackage: ScriptPackageRecord;
  readonly flowDiagnostics: readonly PackageFlowDiagnostic[];
  readonly simulationDiagnostics: readonly PackageSimulationDiagnostic[];
}

export class CreationService {
  private readonly draftWriter: DraftPackageWriter;

  constructor(options: CreationServiceOptions) {
    this.draftWriter = options.draftWriter;
  }

  async createDraftFromStoryBible(storyBible: StoryBible): Promise<CreationDraftResult> {
    const diagnostics = validateStoryBibleReferences(storyBible);

    if (diagnostics.length > 0) {
      throw new BadRequestException({
        error: "StoryBibleValidationError",
        message: "Story bible references are invalid",
        diagnostics,
      });
    }

    const scriptPackage = compileStoryBibleToScriptPackage(storyBible);
    const flowDiagnostics = [
      ...analyzeScriptPackageFlow(scriptPackage),
      ...analyzeScriptPackageTruthSupport(scriptPackage),
    ];
    const simulationDiagnostics = simulateScriptPackage(scriptPackage).diagnostics;

    return {
      draftPackage: await this.draftWriter.createDraftPackage(scriptPackage),
      flowDiagnostics,
      simulationDiagnostics,
    };
  }
}
