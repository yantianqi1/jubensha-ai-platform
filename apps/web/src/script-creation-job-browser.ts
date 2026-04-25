import type { StudioGenerateStoryBibleRequest } from "./api-client-types.js";
import type { createApiClient } from "./api-client.js";
import { readValue, updateText, writeValue } from "./browser-dom.js";
import { renderScriptCreationJobContent } from "./script-creation-job-page.js";
import { createScriptCreationJobLiveController } from "./script-creation-job-live.js";
import type { ScriptCreationJobView } from "./script-creation-job-types.js";

export interface ScriptCreationJobBrowserPorts {
  readonly readBrief: () => StudioGenerateStoryBibleRequest;
  readonly createClient: () => ReturnType<typeof createApiClient>;
}

export function initializeScriptCreationJobBrowser(ports: ScriptCreationJobBrowserPorts): void {
  const controller = createScriptCreationJobLiveController({
    readBrief: ports.readBrief,
    readJobId: () => readValue("[data-script-job-id]", ""),
    writeJobId: writeJobId,
    createJob: (request) => ports.createClient().createGenerationJob(request),
    runJob: (jobId) => ports.createClient().runGenerationJob(jobId),
    getJob: (jobId) => ports.createClient().getGenerationJob(jobId),
    renderJob: renderLiveJob,
    renderError: renderLiveError,
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: (timer) => window.clearTimeout(timer as number),
  });

  wireJobButtons(controller);
  loadJobFromUrl(controller);
}

function wireJobButtons(controller: ReturnType<typeof createScriptCreationJobLiveController>): void {
  document.querySelector<HTMLButtonElement>('[data-action="script-job-load"]')?.addEventListener("click", async () => {
    await controller.loadExistingJob();
  });
  document.querySelector<HTMLButtonElement>('[data-action="script-job-create-run"]')?.addEventListener("click", async () => {
    await controller.createAndRunJob();
  });
}

function loadJobFromUrl(controller: ReturnType<typeof createScriptCreationJobLiveController>): void {
  const jobId = new URLSearchParams(window.location.search).get("jobId");
  if (!jobId) return;
  writeJobId(jobId);
  void controller.loadExistingJob();
}

function renderLiveJob(job: ScriptCreationJobView): void {
  const content = document.querySelector<HTMLElement>("[data-script-job-content]");
  if (!content) return;
  content.innerHTML = renderScriptCreationJobContent(job);
  content.dataset.updatedAt = new Date().toISOString();
  scrollJobIntoView();
  updateText("[data-script-job-status]", `已同步 ${job.id} · ${job.stage} · ${job.progress}%`);
  updateText("[data-studio-current-job]", `${job.id} · ${job.stage} · ${job.progress}%`);
  writeValue('[data-admin-field="packageId"]', job.draftPackage?.packageId ?? "");
}

function scrollJobIntoView(): void {
  const shell = document.querySelector<HTMLElement>("[data-script-creation-live]");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  shell?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
}

function renderLiveError(message: string): void {
  updateText("[data-script-job-status]", `任务同步失败：${message}`);
}

function writeJobId(jobId: string): void {
  writeValue("[data-script-job-id]", jobId);
  updateText("[data-script-job-status]", `正在同步 ${jobId} ...`);
}
