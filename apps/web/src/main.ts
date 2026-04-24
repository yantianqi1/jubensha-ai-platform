import { buildInvestigationViewModel } from "./investigation-view-model.js";
import { renderInvestigationPage } from "./template.js";
import { createDemoPackage, createDemoState } from "./demo-data.js";

export function renderDemoPage(): string {
  return renderInvestigationPage(
    buildInvestigationViewModel(createDemoPackage(), createDemoState()),
  );
}
