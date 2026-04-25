import { createApiClient } from "./api-client.js";
import { readChecked, readError, readNonNegativeInteger, readPositiveInteger, readValue, updateText, writeValue } from "./browser-dom.js";
import { createAdminBrowserWorkflow } from "./admin-browser-workflow.js";
import { resolveApiBaseUrl } from "./app-runtime-config.js";
import { createPlayBrowserWorkflow } from "./play-browser-workflow.js";
import { resolveProductSurfaceIdFromPath } from "./product-surfaces.js";
import { createStudioWorkflow } from "./studio-browser-workflow.js";
import { initializeScriptCreationJobBrowser } from "./script-creation-job-browser.js";

type RuntimeStateView = { readonly phase: string; readonly revealedClues: readonly string[]; readonly npcEvents: readonly { readonly npcCode: string; readonly event: string }[]; };

let roomId = "";
const studioWorkflow = createStudioWorkflow({
  readForm: readStudioForm,
  createGenerationJob: (request) => createClient().createGenerationJob(request),
  runGenerationJob: (jobId) => createClient().runGenerationJob(jobId),
  getGenerationJob: (jobId) => createClient().getGenerationJob(jobId),
  compileStoryBibleDraft: (storyBible) => createClient().compileStoryBibleDraft(storyBible),
  writeCompileSource: (value) => writeValue("[data-story-bible-input]", value),
  writeAdminPackageId: (value) => writeValue('[data-admin-field="packageId"]', value),
  renderStudioPanel: updateStudioPanel,
  renderCreationPanel: updateCreationPanel,
});
const adminWorkflow = createAdminBrowserWorkflow({
  readPackageId: () => readValue('[data-admin-field="packageId"]', "").trim(),
  readSemver: () => readValue('[data-admin-field="semver"]', "").trim(),
  readAssetJobId: () => readValue('[data-admin-field="assetJobId"]', "").trim(),
  getPublishReview: (packageId) => createClient().getPublishReview(packageId),
  publishDraft: (packageId, semver) => createClient().publishDraft(packageId, semver),
  runThemeAssetJob: (jobId) => createClient().runThemeAssetJob(jobId),
  getThemeAssetJob: (jobId) => createClient().getThemeAssetJob(jobId),
  writeReview: updateAdminReviewPanel,
  writeReviewError: updateAdminError,
  writePublishStatus: (message) => updateText("[data-admin-publish-result]", message),
  writeAssetJob: (message) => updateText("[data-admin-asset-job]", message),
});
const playWorkflow = createPlayBrowserWorkflow({
  readRoomId: () => readValue("[data-room-id]", roomId).trim(),
  readVersionId: () => readValue('[data-runtime-field="versionId"]', "").trim(),
  readSeatCount: () => readPositiveInteger('[data-runtime-field="seatCount"]', 4),
  readSeatId: () => readValue('[data-runtime-field="seatId"]', "").trim(),
  readPlayerId: () => readValue('[data-runtime-field="playerId"]', "").trim(),
  readActionCode: () => readValue('[data-runtime-field="actionCode"]', "").trim(),
  readExpectedRevision: () => readNonNegativeInteger('[data-runtime-field="expectedRevision"]', 0),
  createRuntimeRoom: (versionId, seatCount) => createClient().createRuntimeRoom(versionId, seatCount),
  joinSeat: (targetRoomId, seatId, playerId) => createClient().joinSeat(targetRoomId, seatId, playerId),
  getPublicSnapshot: (targetRoomId) => createClient().getPublicSnapshot(targetRoomId),
  getSeatSnapshot: (targetRoomId, seatId) => createClient().getSeatSnapshot(targetRoomId, seatId),
  applyRoomAction: (targetRoomId, actionCode, expectedRevision) =>
    createClient().applyRoomAction(targetRoomId, actionCode, expectedRevision),
  writeRoomId: (targetRoomId) => {
    roomId = targetRoomId;
    writeValue("[data-room-id]", targetRoomId);
  },
  writeExpectedRevision: (revision) => writeValue('[data-runtime-field="expectedRevision"]', String(revision)),
  writeStatus: setStatus,
  writeSnapshot: (message) => updateText("[data-runtime-snapshot]", message),
  renderRoomState: renderRuntimeRoomState,
});

document.documentElement.dataset.ready = "true";
initializeProductSurface();
initializeApiBaseUrl();
initializeScriptCreationJobBrowser({ readBrief: readStudioForm, createClient });
wireControls();

function initializeProductSurface(): void {
  const surfaceId = resolveProductSurfaceIdFromPath(window.location.pathname);
  document.documentElement.dataset.surface = surfaceId;
  document.querySelector<HTMLElement>("[data-surface-shell]")?.setAttribute("data-surface-shell", surfaceId);
  document.querySelectorAll<HTMLElement>("[data-surface-link]").forEach((link) => {
    link.toggleAttribute("aria-current", link.dataset.surfaceLink === surfaceId);
  });
}

function createClient() {
  const baseUrl = readValue("[data-base-url]", resolveApiBaseUrl(window.location));
  return createApiClient(baseUrl, {
    operatorId: readValue('[data-admin-field="operatorId"]', "").trim(),
    playerId: readValue('[data-runtime-field="playerId"]', "").trim(),
  });
}

function initializeApiBaseUrl(): void {
  writeValue("[data-base-url]", resolveApiBaseUrl(window.location));
}

function wireControls(): void {
  document.querySelector<HTMLButtonElement>('[data-action="start-demo"]')?.addEventListener("click", async () => {
    await startDemo();
  });

  document.querySelector<HTMLButtonElement>('[data-action="ask-npc"]')?.addEventListener("click", async () => {
    await askNpc();
  });

  document.querySelector<HTMLButtonElement>('[data-action="create-runtime-room"]')?.addEventListener("click", async () => {
    await playWorkflow.createRuntimeRoom();
  });

  document.querySelector<HTMLButtonElement>('[data-action="join-seat"]')?.addEventListener("click", async () => {
    await playWorkflow.joinSeat();
  });

  document.querySelector<HTMLButtonElement>('[data-action="read-public-snapshot"]')?.addEventListener("click", async () => {
    await playWorkflow.readPublicSnapshot();
  });

  document.querySelector<HTMLButtonElement>('[data-action="read-seat-snapshot"]')?.addEventListener("click", async () => {
    await playWorkflow.readSeatSnapshot();
  });

  document.querySelector<HTMLButtonElement>('[data-action="apply-room-action"]')?.addEventListener("click", async () => {
    await playWorkflow.applyRoomAction();
  });

  document.querySelector<HTMLButtonElement>('[data-action="compile-story-bible"]')?.addEventListener("click", async () => {
    await compileStoryBibleDraftFromInput();
  });

  document.querySelector<HTMLButtonElement>('[data-action="generate-story-bible"]')?.addEventListener("click", async () => {
    await studioWorkflow.generateStoryBible();
  });

  document.querySelector<HTMLButtonElement>('[data-action="retry-story-bible"]')?.addEventListener("click", async () => {
    await studioWorkflow.generateStoryBible();
  });

  document.querySelector<HTMLButtonElement>('[data-action="compile-generated-story-bible"]')?.addEventListener("click", async () => {
    await studioWorkflow.compileGeneratedStoryBibleDraft();
  });

  document.querySelector<HTMLButtonElement>('[data-action="fetch-publish-review"]')?.addEventListener("click", async () => {
    await adminWorkflow.fetchPublishReview();
  });

  document.querySelector<HTMLButtonElement>('[data-action="publish-draft"]')?.addEventListener("click", async () => {
    await adminWorkflow.publishDraft();
  });

  document.querySelector<HTMLButtonElement>('[data-action="inspect-asset-job"]')?.addEventListener("click", async () => {
    await adminWorkflow.inspectAssetJob();
  });

  document.querySelector<HTMLButtonElement>('[data-action="run-asset-job"]')?.addEventListener("click", async () => {
    await adminWorkflow.runAssetJob();
  });
}

async function startDemo(): Promise<void> {
  setStatus("启动雾港 demo 中...");

  try {
    const result = await createClient().startFogHarborDemo();
    roomId = result.room.id;
    writeValue("[data-room-id]", roomId);
    setStatus(`demo 已启动：package ${result.packageId} / room ${result.room.id}`);
    updateResponse(JSON.stringify(result.room.state, null, 2));
    updateShadowStatus("demo 房间已创建，准备盘问。");
    renderRuntimeRoomState(result.room);
  } catch (error) {
    setStatus(readError(error));
  }
}

function readStudioForm() {
  return {
    title: readValue('[data-studio-field="title"]', ""),
    genre: readValue('[data-studio-field="genre"]', "mystery"),
    playerCount: readPositiveInteger('[data-studio-field="playerCount"]', 4),
    durationMinutes: readPositiveInteger('[data-studio-field="durationMinutes"]', 180),
    difficulty: readValue('[data-studio-field="difficulty"]', "medium"),
    supernaturalAllowed: readChecked('[data-studio-field="supernaturalAllowed"]'),
    premise: readValue('[data-studio-field="premise"]', ""),
    tone: readValue('[data-studio-field="tone"]', "悬疑"),
    themeStatement: readValue('[data-studio-field="themeStatement"]', ""),
  };
}

async function compileStoryBibleDraftFromInput(): Promise<void> {
  const input = readValue("[data-story-bible-input]", "");
  updateCreationPanel({ diagnostics: "Flow diagnostics 等待编译结果...", output: "StoryBible 编译中..." });

  try {
    const storyBible = JSON.parse(input) as unknown;
    const result = await createClient().compileStoryBibleDraft(storyBible);
    updateCreationPanel({ diagnostics: renderFlowDiagnostics(result), output: JSON.stringify(result, null, 2) });
  } catch (error) {
    updateCreationPanel({ diagnostics: "Flow diagnostics 未完成。", output: readError(error) });
  }
}

async function askNpc(): Promise<void> {
  const targetRoomId = readValue("[data-room-id]", roomId);
  const npcCode = readValue("[data-npc-code]", "butler");
  const message = readValue("[data-message]", "窗台怎么回事？");

  if (!targetRoomId) {
    setStatus("请先启动 demo 创建房间。");
    return;
  }

  setStatus(`向 ${npcCode} 盘问中...`);

  try {
    const client = createClient();
    const response = await client.askNpc(targetRoomId, npcCode, message);
    updateResponse(JSON.stringify(response, null, 2));
    updateShadowStatus(
      response.shadowValidation.accepted ? "Shadow 校验通过。" : "Shadow 校验拒绝了部分提案。",
      response.shadowValidation.results,
    );
    renderRuntimeRoomState(await client.getRoom(targetRoomId));
    setStatus("盘问完成，运行时状态保持服务端权威。");
  } catch (error) {
    setStatus(readError(error));
  }
}

function renderRuntimeRoomState(room: { revision: number; state: RuntimeStateView }): void {
  renderRuntimeState(room.state);
  updateText("[data-runtime-snapshot]", `Room revision ${room.revision} 已同步。`);
}

function renderRuntimeState(state: RuntimeStateView): void {
  document.querySelector<HTMLElement>("[data-phase]")!.textContent = state.phase;
  document.querySelector<HTMLElement>("[data-clue-board]")!.textContent = `已揭示线索：${state.revealedClues.join(", ") || "无"}`;
  document.querySelector<HTMLElement>("[data-timeline]")!.textContent = state.npcEvents.map(formatNpcEvent).join("\n") || "暂无 NPC 事件";
}

function formatNpcEvent(entry: { readonly npcCode: string; readonly event: string }): string {
  return `${entry.npcCode}: ${entry.event}`;
}

function updateResponse(value: string): void {
  document.querySelector<HTMLElement>("[data-response]")!.textContent = value;
}

function updateShadowStatus(value: string, results?: readonly unknown[]): void {
  document.querySelector<HTMLElement>("[data-shadow-status]")!.textContent = results ? `${value} ${JSON.stringify(results)}` : value;
}

function updateCreationOutput(value: string): void {
  document.querySelector<HTMLElement>("[data-creation-output]")!.textContent = value;
}

function updateCreationDiagnostics(value: string): void {
  document.querySelector<HTMLElement>("[data-creation-diagnostics]")!.textContent = value;
}

function updateCreationPanel(state: { diagnostics: string; output: string }): void {
  updateCreationDiagnostics(state.diagnostics);
  updateCreationOutput(state.output);
}

function renderFlowDiagnostics(result: { readonly flowDiagnostics: readonly unknown[] }): string {
  return result.flowDiagnostics.length === 0
    ? "Flow diagnostics 通过：未发现静态流程问题。"
    : `Flow diagnostics 发现 ${result.flowDiagnostics.length} 个问题。`;
}

function updateStudioPanel(state: {
  readonly attempts: string;
  readonly relations: string;
  readonly diff: string;
  readonly skeletonDraft: string;
  readonly skeletonStatus: string;
}): void {
  document.querySelector<HTMLElement>("[data-studio-attempts]")!.textContent = state.attempts;
  document.querySelector<HTMLElement>("[data-studio-relations]")!.textContent = state.relations;
  document.querySelector<HTMLElement>("[data-studio-diff]")!.textContent = state.diff;
  document.querySelector<HTMLElement>("[data-studio-skeleton-state]")!.textContent = state.skeletonStatus;
  writeValue("[data-studio-skeleton-editor]", state.skeletonDraft);
}

function updateAdminReviewPanel(state: {
  readonly title: string;
  readonly readiness: string;
  readonly qualityCounts: string;
  readonly goldenRegression: string;
  readonly blockers: readonly string[];
}): void {
  updateText("[data-admin-readiness]", `${state.title} · ${state.readiness}`);
  updateText("[data-admin-quality]", state.qualityCounts);
  updateText("[data-admin-golden-regression]", state.goldenRegression);
  updateText("[data-admin-blockers]", state.blockers.join("\n"));
}

function updateAdminError(message: string): void {
  updateText("[data-admin-readiness]", "Publish review 失败。");
  updateText("[data-admin-blockers]", message);
}

function setStatus(value: string): void {
  updateText("[data-status]", value);
}
