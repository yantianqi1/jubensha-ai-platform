import type { InvestigationViewModel } from "./investigation-view-model.js";
import { renderPlayControls } from "./play-template.js";
import { productSurfaceRoutes, type ProductSurfaceId } from "./product-surfaces.js";
import { renderStudioSurface } from "./studio-template.js";

export function renderInvestigationPage(
  model: InvestigationViewModel,
  activeSurface: ProductSurfaceId = "play-web",
): string {
  return `<!doctype html>
<html lang="zh-CN">
${renderHead(model)}
<body>
  <main class="shell" data-title="${escapeHtml(model.title)}" data-surface-shell="${activeSurface}">
    ${renderSurfaceNav(activeSurface)}
    ${renderHero(model)}
    <div data-surface-panel="play-web">
      ${renderPlayControls()}
      ${renderWorkspace(model)}
    </div>
    <div data-surface-panel="studio-web">
      ${renderStudioSurface()}
    </div>
    <div data-surface-panel="admin-web">
      ${renderAdminPanel()}
    </div>
  </main>
  <script type="module" src="/app.js"></script>
</body>
</html>`;
}

function renderSurfaceNav(activeSurface: ProductSurfaceId): string {
  const links = productSurfaceRoutes.map((route) => {
    const current = route.id === activeSurface ? " aria-current=\"page\"" : "";
    return `<a href="${route.basePath}" data-surface-link="${route.id}"${current}>${route.label}</a>`;
  });

  return `<nav class="surface-nav" data-surface-nav aria-label="产品入口">${links.join("")}</nav>`;
}

function renderHead(model: InvestigationViewModel): string {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(model.title)} · 调查界面</title>
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/script-creation-job.css" />
</head>`;
}

function renderHero(model: InvestigationViewModel): string {
  return `<section class="hero" aria-labelledby="page-title">
  <p class="eyebrow">LLM 剧本杀 · 推理工作台</p>
  <h1 class="display-title" id="page-title">${escapeHtml(model.title)}</h1>
  <p class="phase">当前：<span data-phase>${escapeHtml(model.activePhase.label)}</span></p>
</section>`;
}

function renderAdminPanel(): string {
  return `<section class="admin-panel panel panel-muted" aria-labelledby="admin-title">
  <p class="eyebrow">Admin Surface</p>
  <h2 id="admin-title">运营诊断</h2>
  <div class="admin-form"><label>Operator ID<input data-admin-field="operatorId" type="text" value="operator_dev" /></label></div>
  <div class="admin-form"><label>Package ID<input data-admin-field="packageId" type="text" placeholder="pkg_..." /></label><button class="button-secondary button-compact" data-action="fetch-publish-review">读取发布审核</button></div>
  <p class="status" data-admin-readiness>等待 publish review。</p>
  <p class="status" data-admin-quality>Quality Gate 尚未执行。</p>
  <p class="status" data-admin-golden-regression>Golden Regression 尚未执行。</p>
  <pre data-admin-blockers>发布阻断项等待查询。</pre>
  <div class="admin-form"><label>Semver<input data-admin-field="semver" type="text" value="1.0.0" /></label><button class="button-secondary button-compact" data-action="publish-draft">显式发布</button></div>
  <p class="status" data-admin-publish-result>等待显式发布；PublishGate 会阻断无效草稿。</p>
  <div class="admin-form"><label>Asset Job ID<input data-admin-field="assetJobId" type="text" placeholder="theme_asset_job_..." /></label><button class="button-ghost button-compact" data-action="inspect-asset-job">查看资产任务</button><button class="button-secondary button-compact" data-action="run-asset-job">执行资产任务</button></div>
  <p class="status" data-admin-asset-job>Asset job 未查询，不假设生成完成。</p>
</section>`;
}

function renderWorkspace(model: InvestigationViewModel): string {
  return `<section class="workspace">
  ${renderClueBoard(model)}
  ${renderTimeline(model)}
  ${renderSuspectMatrix(model)}
  ${renderResponsePanel()}
</section>`;
}

function renderClueBoard(model: InvestigationViewModel): string {
  return `<section class="panel clue-board" aria-labelledby="clue-board-title">
  <h2 id="clue-board-title">线索板</h2>
  <div class="card-grid" data-clue-board>${model.clueBoard.map(renderClue).join("")}</div>
</section>`;
}

function renderTimeline(model: InvestigationViewModel): string {
  return `<section class="panel timeline" aria-labelledby="timeline-title">
  <h2 id="timeline-title">时间线</h2>
  <ol data-timeline>${model.timeline.map(renderTimelineEntry).join("")}</ol>
</section>`;
}

function renderSuspectMatrix(model: InvestigationViewModel): string {
  return `<section class="panel suspect-matrix" aria-labelledby="suspect-title">
  <h2 id="suspect-title">嫌疑矩阵</h2>
  <div class="suspects" data-suspects>${model.suspects.map(renderSuspect).join("")}</div>
</section>`;
}

function renderResponsePanel(): string {
  return `<section class="panel response-panel" aria-labelledby="response-title">
  <h2 id="response-title">NPC 回应</h2>
  <pre data-response>等待操作。</pre>
</section>`;
}


function renderClue(clue: InvestigationViewModel["clueBoard"][number]): string {
  const state = clue.revealed ? "已揭示" : "封存";
  return `<article class="clue ${clue.revealed ? "revealed" : "locked"}">
    <span>${escapeHtml(clue.code)}</span>
    <h3>${escapeHtml(clue.title)}</h3>
    <p>${escapeHtml(clue.content)}</p>
    <small>${state}</small>
  </article>`;
}

function renderTimelineEntry(entry: InvestigationViewModel["timeline"][number]): string {
  return `<li class="${entry.kind}">${escapeHtml(entry.label)}</li>`;
}

function renderSuspect(suspect: InvestigationViewModel["suspects"][number]): string {
  return `<article class="suspect">
    <strong>${escapeHtml(suspect.name)}</strong>
    <span>${escapeHtml(suspect.code)}</span>
    <p>${escapeHtml(suspect.profile)}</p>
    <meter min="0" max="5" value="${suspect.evidenceCount}"></meter>
    <small>关联证据 ${suspect.evidenceCount}</small>
  </article>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
