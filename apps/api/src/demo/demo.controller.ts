import { Controller, Inject, Post } from "@nestjs/common";
import { ContentService } from "../content/content-service.js";
import { RuntimeService } from "../runtime/runtime-service.js";
import { fogHarborDemoPackage } from "./demo-package.js";

@Controller("demo")
export class DemoController {
  constructor(
    @Inject(ContentService) private readonly contentService: ContentService,
    @Inject(RuntimeService) private readonly runtimeService: RuntimeService,
  ) {}

  @Post("fog-harbor")
  async runFogHarbor() {
    const scriptPackage = await this.contentService.createDraftPackage(fogHarborDemoPackage);
    const version = await this.contentService.publishDraft(scriptPackage.id, "1.0.0");
    const room = await this.runtimeService.createRoom({
      versionId: version.id,
      seatCount: 3,
    });
    const roomAfterAction = await this.runtimeService.applyRoomAction(
      room.id,
      "inspect_window",
    );

    return {
      packageId: scriptPackage.id,
      versionId: version.id,
      room: roomAfterAction,
    };
  }
}
