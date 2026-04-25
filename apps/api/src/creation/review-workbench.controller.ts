import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ContentService } from "../content/content-service.js";
import { runGoldenPackageRegression } from "./golden-packages.js";
import { QualityGate } from "./quality-gate.js";

export interface ReviewWorkbenchSummary {
  readonly packageId: string;
  readonly draft: {
    readonly title: string;
    readonly packageCode: string;
    readonly quality: ReturnType<QualityGate["reviewPackage"]>;
  };
  readonly goldenRegressions: ReturnType<typeof runGoldenPackageRegression>;
}

@Controller("creation/review-workbench")
export class ReviewWorkbenchController {
  constructor(
    @Inject(ContentService) private readonly contentService: ContentService,
    @Inject(QualityGate) private readonly qualityGate: QualityGate,
  ) {}

  @Get("packages/:packageId")
  async getPackageReview(@Param("packageId") packageId: string): Promise<ReviewWorkbenchSummary> {
    const record = await this.contentService.getPackage(packageId);
    const content = record.currentDraft.content;

    return {
      packageId,
      draft: {
        title: content.title,
        packageCode: content.package_code,
        quality: this.qualityGate.reviewPackage(content),
      },
      goldenRegressions: runGoldenPackageRegression(),
    };
  }
}
