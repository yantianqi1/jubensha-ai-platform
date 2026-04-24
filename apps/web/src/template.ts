import type { InvestigationViewModel } from "./investigation-view-model.js";

export function renderInvestigationPage(model: InvestigationViewModel): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(model.title)} · 调查界面</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main class="shell">
    <section class="hero" aria-labelledby="page-title">
      <p class="eyebrow">LLM 剧本杀 · 推理工作台</p>
      <h1 id="page-title">${escapeHtml(model.title)}</h1>
      <p class="phase">当前：${escapeHtml(model.activePhase.label)}</p>
    </section>
    <section class="workspace">
      <section class="panel clue-board" aria-labelledby="clue-board-title">
        <h2 id="clue-board-title">线索板</h2>
        <div class="card-grid">${model.clueBoard.map(renderClue).join("")}</div>
      </section>
      <section class="panel timeline" aria-labelledby="timeline-title">
        <h2 id="timeline-title">时间线</h2>
        <ol>${model.timeline.map(renderTimelineEntry).join("")}</ol>
      </section>
      <section class="panel suspect-matrix" aria-labelledby="suspect-title">
        <h2 id="suspect-title">嫌疑矩阵</h2>
        <div class="suspects">${model.suspects.map(renderSuspect).join("")}</div>
      </section>
    </section>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>`;
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
