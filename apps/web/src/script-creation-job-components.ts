import type {
  ScriptCreationActivityView,
  ScriptCreationDiagnosticView,
  ScriptCreationJobStage,
  ScriptCreationJobView,
} from "./script-creation-job-types.js";

const pipelineStages: readonly { readonly stage: ScriptCreationJobStage; readonly label: string }[] = [
  { stage: "queued", label: "排队" },
  { stage: "received_brief", label: "接收 Brief" },
  { stage: "planning_story", label: "剧情规划" },
  { stage: "criticizing_story", label: "Critic 审阅" },
  { stage: "compiling_draft", label: "编译草稿" },
  { stage: "deterministic_review", label: "确定性审核" },
  { stage: "ready_for_review", label: "人工审核" },
];

export function renderProgressHero(job: ScriptCreationJobView): string {
  return `<section class="job-hero" data-component="ProgressHero" data-state="${job.stage}">
  <div>
    <p class="job-kicker">AI Studio · Creation Pipeline</p>
    <h2>Script Creation Job</h2>
    <p class="job-brief">${escapeHtml(job.brief)}</p>
  </div>
  <div class="job-hero-status">
    ${renderStatusBadge(job.stage, job.readyForPublish)}
    <strong>${job.progress}%</strong>
    <span>readyForPublish=${String(job.readyForPublish)}</span>
  </div>
  <div class="job-progress-track" aria-label="创建进度" aria-valuenow="${job.progress}" aria-valuemin="0" aria-valuemax="100" role="progressbar">
    <span class="job-progress-fill" style="width:${job.progress}%"></span>
  </div>
</section>`;
}

export function renderPipelineStepper(activeStage: ScriptCreationJobStage): string {
  const activeIndex = findStageIndex(activeStage);
  const steps = pipelineStages.map((step, index) => renderStep(step.stage, step.label, index, activeIndex));
  return `<ol class="job-stepper" data-component="PipelineStepper">${steps.join("")}</ol>`;
}

export function renderStatusBadge(stage: ScriptCreationJobStage, readyForPublish: boolean): string {
  const label = stage.replaceAll("_", " ");
  const publishState = readyForPublish ? "publish-ready" : "review-needed";
  return `<span class="status-badge status-badge--${stage}" data-component="StatusBadge">${label} · ${publishState}</span>`;
}

export function renderActivityLogPanel(items: readonly ScriptCreationActivityView[]): string {
  const rows = items.map((item) => `<li class="activity-log__item activity-log__item--${item.severity}">
    <time>${escapeHtml(item.time)}</time><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span>
  </li>`);
  return `<aside class="activity-log" data-component="ActivityLogPanel" aria-label="创建活动日志">
    <h3>Activity Log</h3><ul>${rows.join("")}</ul>
  </aside>`;
}

export function renderResultSections(job: ScriptCreationJobView): string {
  return `<section class="job-results" data-component="ResultSections">
  <details class="result-section" open><summary>Overview</summary>${renderOverview(job)}</details>
  <details class="result-section"><summary>Story Bible</summary>${renderStoryBibleCard(job)}</details>
  <details class="result-section"><summary>Draft</summary>${renderDraftPackageCard(job)}</details>
  <details class="result-section"><summary>Quality</summary>${renderQualityReportCard(job)}</details>
  <details class="result-section"><summary>Activity</summary>${renderActivityLogInline(job.activity)}</details>
  <details class="result-section"><summary>Advanced / Raw JSON</summary>${renderRawJobSummary(job)}</details>
</section>`;
}

export function renderStoryBibleCard(job: ScriptCreationJobView): string {
  if (!job.storyBible) return renderCompactEmptyState("Story Bible", "等待 planner 输出结构化剧情圣经。");
  const characters = job.storyBible.characters.map((name) => `<span>${escapeHtml(name)}</span>`).join("");
  return `<article class="result-card" data-component="StoryBibleCard">
    <p class="job-kicker">Story Bible</p><h3>${escapeHtml(job.storyBible.premise)}</h3>
    <p>${escapeHtml(job.storyBible.theme)}</p><div class="pill-row">${characters}</div>
  </article>`;
}

export function renderCriticReviewCard(job: ScriptCreationJobView): string {
  if (!job.criticReview) return renderCompactEmptyState("Critic Review", "Critic review pending");
  return `<article class="result-card" data-component="CriticReviewCard">
    <p class="job-kicker">Critic Review</p><h3>${escapeHtml(job.criticReview.verdict)}</h3>
    ${renderDiagnostics(job.criticReview.diagnostics)}
  </article>`;
}

export function renderDraftPackageCard(job: ScriptCreationJobView): string {
  if (!job.draftPackage) return renderCompactEmptyState("ScriptPackage Draft", "ScriptPackage draft pending");
  return `<article class="result-card" data-component="DraftPackageCard">
    <p class="job-kicker">ScriptPackage Draft</p><h3>${escapeHtml(job.draftPackage.packageId)}</h3>
    <div class="metric-grid"><span>${job.draftPackage.acts} acts</span><span>${job.draftPackage.scenes} scenes</span><span>${job.draftPackage.clues} clues</span></div>
  </article>`;
}

export function renderQualityReportCard(job: ScriptCreationJobView): string {
  if (!job.qualityReport) return renderCompactEmptyState("Quality Report", "Deterministic review pending");
  const state = job.readyForPublish ? renderSuccessState() : renderErrorState(job.errors);
  return `<article class="result-card" data-component="QualityReportCard">
    <p class="job-kicker">Quality Report</p><h3>Deterministic score ${job.qualityReport.score}</h3>
    ${renderCriticReviewCard(job)}${renderDiagnostics(job.qualityReport.diagnostics)}${state}
  </article>`;
}

export function renderSkeleton(component: string, label: string): string {
  return `<article class="result-card result-card--skeleton" data-component="Skeleton" data-skeleton-for="${component}">
    <span class="skeleton-line skeleton-line--short"></span><span class="skeleton-line"></span><p>${escapeHtml(label)}</p>
  </article>`;
}

export function renderEmptyState(title: string, detail: string): string {
  return `<article class="state-card" data-component="EmptyState"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></article>`;
}

export function renderCompactEmptyState(title: string, detail: string): string {
  return `<article class="state-card state-card--compact" data-component="EmptyState"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></article>`;
}

export function renderErrorState(errors: readonly ScriptCreationDiagnosticView[]): string {
  const first = errors[0];
  const code = first?.code ?? "explicit_error";
  const detail = first?.message ?? "阻断项需要显式展示。";
  return `<div class="state-card state-card--error" data-component="ErrorState"><strong>${escapeHtml(code)}</strong><p>${escapeHtml(detail)}</p></div>`;
}

export function renderSuccessState(): string {
  return `<div class="state-card state-card--success" data-component="SuccessState"><strong>Ready for review</strong><p>草稿可进入人工审核；不会自动发布。</p></div>`;
}

function renderOverview(job: ScriptCreationJobView): string {
  return `<div class="overview-grid" data-component="OverviewMetrics">
    ${renderMetric("Title", job.title)}${renderMetric("Logline", job.storyBible?.premise ?? "等待 Story Bible")}
    ${renderMetric("Roles", readRoleCount(job))}${renderMetric("Clues", String(job.draftPackage?.clues ?? "--"))}
    ${renderMetric("Acts", String(job.draftPackage?.acts ?? "--"))}${renderMetric("Critic", job.criticReview?.verdict ?? "pending")}
    ${renderMetric("Errors", String(job.errors.length))}${renderMetric("draftPackageId", job.draftPackage?.packageId ?? "--")}
    ${renderMetric("readyForPublish", String(job.readyForPublish))}
  </div>`;
}

function renderMetric(label: string, value: string): string {
  return `<div class="summary-chip"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function readRoleCount(job: ScriptCreationJobView): string {
  const roleChip = job.storyBible?.characters.find((item) => item.includes("roles"));
  return roleChip?.replace(" roles", "") ?? "--";
}

function renderActivityLogInline(items: readonly ScriptCreationActivityView[]): string {
  const rows = items.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></li>`);
  return `<ul class="activity-inline">${rows.join("") || "<li>暂无活动。</li>"}</ul>`;
}

function renderRawJobSummary(job: ScriptCreationJobView): string {
  const payload = { id: job.id, stage: job.stage, progress: job.progress, readyForPublish: job.readyForPublish, errors: job.errors };
  return `<pre class="readable-output raw-json-output" data-component="RawJobSummary">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
}

function renderStep(stage: ScriptCreationJobStage, label: string, index: number, activeIndex: number): string {
  const state = index < activeIndex ? "complete" : index === activeIndex ? "active" : "upcoming";
  return `<li class="job-step job-step--${state}" data-step="${stage}"><span>${index + 1}</span><strong>${label}</strong></li>`;
}

function renderDiagnostics(items: readonly ScriptCreationDiagnosticView[]): string {
  const rows = items.map((item) => `<li class="diagnostic diagnostic--${item.severity}"><code>${escapeHtml(item.code)}</code><span>${escapeHtml(item.message)}</span></li>`);
  return `<ul class="diagnostic-list">${rows.join("")}</ul>`;
}

function findStageIndex(stage: ScriptCreationJobStage): number {
  if (stage === "blocked" || stage === "failed") return pipelineStages.length - 1;
  return Math.max(0, pipelineStages.findIndex((step) => step.stage === stage));
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
