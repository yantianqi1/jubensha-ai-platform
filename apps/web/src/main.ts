import { buildInvestigationViewModel } from "./investigation-view-model.js";
import { renderInvestigationPage } from "./template.js";
import type { ProductSurfaceId } from "./product-surfaces.js";
import { createDemoPackage, createDemoState } from "./demo-data.js";

export function renderDemoPage(surface: ProductSurfaceId = "play-web"): string {
  return renderInvestigationPage(
    buildInvestigationViewModel(createDemoPackage(), createDemoState()),
    surface,
  );
}
