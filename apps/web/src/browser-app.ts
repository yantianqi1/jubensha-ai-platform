import { createApiClient } from "./api-client.js";

let roomId = "";

document.documentElement.dataset.ready = "true";
wireControls();

function createClient() {
  const baseUrl = readValue("[data-base-url]", "http://127.0.0.1:3001");
  return createApiClient(baseUrl);
}

function wireControls(): void {
  document.querySelector<HTMLButtonElement>('[data-action="start-demo"]')?.addEventListener("click", async () => {
    await startDemo();
  });

  document.querySelector<HTMLButtonElement>('[data-action="ask-npc"]')?.addEventListener("click", async () => {
    await askNpc();
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
    renderRoomState(result.room.state);
  } catch (error) {
    setStatus(readError(error));
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
    renderRoomState((await client.getRoom(targetRoomId)).state);
    setStatus("盘问完成，运行时状态保持服务端权威。");
  } catch (error) {
    setStatus(readError(error));
  }
}

function renderRoomState(state: { phase: string; revealedClues: readonly string[]; npcEvents: readonly { npcCode: string; event: string }[] }): void {
  document.querySelector<HTMLElement>("[data-phase]")!.textContent = state.phase;
  document.querySelector<HTMLElement>("[data-clue-board]")!.textContent = `已揭示线索：${state.revealedClues.join(", ") || "无"}`;
  document.querySelector<HTMLElement>("[data-timeline]")!.textContent = state.npcEvents.map((entry) => `${entry.npcCode}: ${entry.event}`).join("\n") || "暂无 NPC 事件";
}

function updateResponse(value: string): void {
  document.querySelector<HTMLElement>("[data-response]")!.textContent = value;
}

function updateShadowStatus(value: string, results?: readonly unknown[]): void {
  document.querySelector<HTMLElement>("[data-shadow-status]")!.textContent = results ? `${value} ${JSON.stringify(results)}` : value;
}

function setStatus(value: string): void {
  document.querySelector<HTMLElement>("[data-status]")!.textContent = value;
}

function readValue(selector: string, fallback: string): string {
  return document.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.value || fallback;
}

function writeValue(selector: string, value: string): void {
  const element = document.querySelector<HTMLInputElement>(selector);
  if (element) {
    element.value = value;
  }
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
