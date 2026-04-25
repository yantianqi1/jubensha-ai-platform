import {
  renderActivityLogPanel,
  renderCompactEmptyState,
  renderErrorState,
  renderPipelineStepper,
  renderProgressHero,
  renderResultSections,
} from "./script-creation-job-components.js";
import type { ScriptCreationJobView } from "./script-creation-job-types.js";

export function renderScriptCreationJobPage(job?: ScriptCreationJobView): string {
  return `<section class="script-job-shell" data-script-creation-live="polling" aria-labelledby="script-job-title">
  <div class="script-job-orb" aria-hidden="true"></div>
  <div class="job-workspace-heading"><p class="job-kicker">Primary workflow</p><h3 id="script-job-title">Script Creation Job</h3></div>
  ${renderJobControls()}
  <div data-script-job-content>${job ? renderScriptCreationJobContent(job) : renderEmptyJobContent()}</div>
</section>`;
}

export function renderScriptCreationJobContent(job: ScriptCreationJobView): string {
  return `${renderProgressHero(job)}
  ${renderPipelineStepper(job.stage)}
  <div class="script-job-layout">
    <div class="job-result-stack">
      ${renderActiveStageSummary(job)}
      ${renderResultSections(job)}
      ${job.errors.length > 0 ? renderErrorState(job.errors) : ""}
    </div>
    ${renderActivityLogPanel(job.activity)}
  </div>`;
}

function renderJobControls(): string {
  return `<div class="job-live-controls" aria-label="Script creation job controls">
    <label>Generation Job ID<input data-script-job-id type="text" placeholder="generation_job_..." /></label>
    <button class="button-secondary button-compact" data-action="script-job-load" type="button">读取已有任务</button>
    <p class="status" data-script-job-status>使用左侧 brief 创建任务，或输入 jobId 继续轮询。</p>
  </div>`;
}

function renderEmptyJobContent(): string {
  return `<div class="job-empty-state">
    ${renderCompactEmptyState("等待 generation job", "左侧填写 brief 后创建任务，或输入 jobId 读取已有任务。")}
  </div>`;
}

function renderActiveStageSummary(job: ScriptCreationJobView): string {
  const latestActivity = job.activity[0]?.title ?? "等待后端活动。";
  return `<section class="active-stage-card" data-component="ActiveStageSummary">
    <div><p class="job-kicker">Active Stage</p><h3>${job.stage.replaceAll("_", " ")}</h3></div>
    <p>${latestActivity}</p>
  </section>`;
}
