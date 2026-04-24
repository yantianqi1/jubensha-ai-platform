import type { InvestigationViewModel } from "./investigation-view-model.js";

export function renderInvestigationPage(model: InvestigationViewModel): string {
  return `<!doctype html>
<html lang="zh-CN">
${renderHead(model)}
<body>
  <main class="shell" data-title="${escapeHtml(model.title)}">
    ${renderHero(model)}
    ${renderControls()}
    ${renderWorkspace(model)}
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>`;
}

function renderHead(model: InvestigationViewModel): string {
  return `<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(model.title)} · 调查界面</title>
  <link rel="stylesheet" href="./styles.css" />
</head>`;
}

function renderHero(model: InvestigationViewModel): string {
  return `<section class="hero" aria-labelledby="page-title">
  <p class="eyebrow">LLM 剧本杀 · 推理工作台</p>
  <h1 id="page-title">${escapeHtml(model.title)}</h1>
  <p class="phase">当前：<span data-phase>${escapeHtml(model.activePhase.label)}</span></p>
</section>`;
}

function renderControls(): string {
  return `<section class="controls panel" aria-labelledby="controls-title">
  <h2 id="controls-title">操作入口</h2>
  <div class="control-row">
    <label>API 基础地址<input data-base-url type="url" value="http://127.0.0.1:3001" /></label>
    <button data-action="start-demo">启动雾港 demo</button>
  </div>
  <div class="control-row">
    <label>房间 ID<input data-room-id type="text" placeholder="点击启动 demo 自动填入" /></label>
    <label>NPC 角色${renderNpcSelect()}</label>
    <label>盘问内容<input data-message type="text" value="窗台怎么回事？" /></label>
    <button data-action="ask-npc">盘问 NPC</button>
  </div>
  <p class="status" data-status>尚未连接 API。</p>
  <p class="status shadow" data-shadow-status>Shadow 校验未执行。</p>
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

function renderNpcSelect(): string {
  return `<select data-npc-code>
  <option value="butler">管家</option>
  <option value="doctor">医生</option>
</select>`;
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
