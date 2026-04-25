import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ContentService } from "../content/content-service.js";
import { runGoldenPackageRegression, summarizeGoldenPackageRegression } from "./golden-packages.js";
import { QualityGate } from "./quality-gate.js";

export interface PublishReviewBlocker {
  readonly source: "quality_gate" | "golden_regression";
  readonly code: string;
  readonly path: string;
  readonly message?: string;
}

export interface PublishReviewSummary {
  readonly packageId: string;
  readonly title: string;
  readonly packageCode: string;
  readonly readyForPublish: boolean;
  readonly checks: {
    readonly qualityGate: ReturnType<QualityGate["reviewPackage"]>;
    readonly goldenRegression: ReturnType<typeof summarizeGoldenPackageRegression>;
  };
  readonly blockers: readonly PublishReviewBlocker[];
}

@Controller("creation/publish-review")
export class PublishReviewController {
  constructor(
    @Inject(ContentService) private readonly contentService: ContentService,
    @Inject(QualityGate) private readonly qualityGate: QualityGate,
  ) {}

  @Get("packages/:packageId")
  async getPublishReview(@Param("packageId") packageId: string): Promise<PublishReviewSummary> {
    const record = await this.contentService.getPackage(packageId);
    const content = record.currentDraft.content;
    const qualityGate = this.qualityGate.reviewPackage(content);
    const goldenRegression = summarizeGoldenPackageRegression(runGoldenPackageRegression());
    const blockers = collectPublishReviewBlockers(qualityGate, goldenRegression);

    return {
      packageId,
      title: content.title,
      packageCode: content.package_code,
      readyForPublish: blockers.length === 0,
      checks: {
        qualityGate,
        goldenRegression,
      },
      blockers,
    };
  }
}

function collectPublishReviewBlockers(
  qualityGate: ReturnType<QualityGate["reviewPackage"]>,
  goldenRegression: ReturnType<typeof summarizeGoldenPackageRegression>,
): readonly PublishReviewBlocker[] {
  return [
    ...qualityGate.diagnostics.map((diagnostic) => ({
      source: "quality_gate" as const,
      code: diagnostic.code,
      path: diagnostic.path,
      message: diagnostic.message,
    })),
    ...goldenRegression.failures.flatMap((failure) =>
      failure.differences.map((difference) => ({
        source: "golden_regression" as const,
        code: "golden_package_drift",
        path: failure.name,
        message: difference,
      })),
    ),
  ];
}
