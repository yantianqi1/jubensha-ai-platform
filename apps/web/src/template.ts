import type { InvestigationViewModel } from "./investigation-view-model.js";
import { renderPlayControls } from "./play-template.js";
import { productSurfaceRoutes, type ProductSurfaceId } from "./product-surfaces.js";

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
      ${renderStudioPanel()}
      ${renderCreationPanel()}
    </div>
    <div data-surface-panel="admin-web">
      ${renderAdminPanel()}
    </div>
  </main>
  <script type="module" src="./app.js"></script>
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

function renderStudioPanel(): string {
  return `<section class="studio-panel panel" aria-labelledby="studio-title">
  <div class="panel-heading">
    <div>
      <p class="eyebrow">Studio MVP</p>
      <h2 id="studio-title">剧情生成工作台</h2>
    </div>
    <div class="button-row">
      <button data-action="generate-story-bible">生成剧情圣经</button>
      <button data-action="retry-story-bible">重试生成</button>
      <button data-action="compile-generated-story-bible">回填编译草稿</button>
      <p class="hint">编译成功后自动回填 Admin Package ID，方便直接读取发布审核。</p>
    </div>
  </div>
  <div class="studio-form">
    <label>标题<input data-studio-field="title" type="text" value="雾港新案" /></label>
    <label>题材<input data-studio-field="genre" type="text" value="mystery" /></label>
    <label>人数<input data-studio-field="playerCount" type="number" min="1" value="4" /></label>
    <label>时长<input data-studio-field="durationMinutes" type="number" min="30" value="180" /></label>
    <label>难度<input data-studio-field="difficulty" type="text" value="medium" /></label>
    <label>基调<input data-studio-field="tone" type="text" value="阴冷、克制、悬疑" /></label>
    <label class="wide">前提<textarea data-studio-field="premise">雾港旧账引发失踪案。</textarea></label>
    <label class="wide">主题命题<textarea data-studio-field="themeStatement">被隐瞒的旧债终会回到当事人身上。</textarea></label>
    <label class="checkbox-row"><input data-studio-field="supernaturalAllowed" type="checkbox" />允许超自然</label>
  </div>
  <div class="studio-grid">
    <section><h3>生成尝试</h3><pre class="readable-output" data-studio-attempts>尚未生成。</pre></section>
    <section><h3>角色关系图</h3><pre class="readable-output" data-studio-relations>尚未生成。</pre></section>
    <section><h3>差异面板</h3><pre class="readable-output" data-studio-diff>尚未重试。</pre></section>
    <section>
      <h3>剧情骨架</h3>
      <p class="status" data-studio-skeleton-state>骨架等待生成。</p>
      <textarea data-studio-skeleton-editor spellcheck="false">尚未生成。</textarea>
    </section>
  </div>
</section>`;
}

function renderCreationPanel(): string {
  return `<section class="creation-panel panel" aria-labelledby="creation-title">
  <div class="panel-heading">
    <div>
      <p class="eyebrow">Creation Pipeline</p>
      <h2 id="creation-title">StoryBible 编译草稿</h2>
    </div>
    <button data-action="compile-story-bible">编译草稿</button>
  </div>
  <label>StoryBible JSON
    <textarea data-story-bible-input spellcheck="false">${escapeHtml(defaultStoryBibleJson())}</textarea>
  </label>
  <p class="status" data-creation-diagnostics>Flow diagnostics 尚未执行。</p>
  <pre class="readable-output" data-creation-output>等待编译 StoryBible。</pre>
</section>`;
}

function renderAdminPanel(): string {
  return `<section class="admin-panel panel" aria-labelledby="admin-title">
  <p class="eyebrow">Admin Surface</p>
  <h2 id="admin-title">运营诊断</h2>
  <div class="admin-form"><label>Package ID<input data-admin-field="packageId" type="text" placeholder="pkg_..." /></label><button data-action="fetch-publish-review">读取发布审核</button></div>
  <p class="status" data-admin-readiness>等待 publish review。</p>
  <p class="status" data-admin-quality>Quality Gate 尚未执行。</p>
  <p class="status" data-admin-golden-regression>Golden Regression 尚未执行。</p>
  <pre data-admin-blockers>发布阻断项等待查询。</pre>
  <div class="admin-form"><label>Semver<input data-admin-field="semver" type="text" value="1.0.0" /></label><button data-action="publish-draft">显式发布</button></div>
  <p class="status" data-admin-publish-result>等待显式发布；PublishGate 会阻断无效草稿。</p>
  <div class="admin-form"><label>Asset Job ID<input data-admin-field="assetJobId" type="text" placeholder="theme_asset_job_..." /></label><button data-action="inspect-asset-job">查看资产任务</button><button data-action="run-asset-job">执行资产任务</button></div>
  <p class="status" data-admin-asset-job>Asset job 未查询，不假设生成完成。</p>
</section>`;
}

function defaultStoryBibleJson(): string {
  return JSON.stringify(
    {
      meta: {
        title: "雾港新案",
        genre: "mystery",
        player_count: 4,
        duration_minutes: 180,
        difficulty: "medium",
        supernatural_allowed: false,
      },
      theme: {
        premise: "雾港码头的旧账本牵出一场失踪案。",
        theme_statement: "被隐瞒的旧债终会回到当事人身上。",
        tone: "阴冷、克制、悬疑",
      },
      truth: {
        core_case: "船主在雾夜失踪，现场只留下潮湿账本。",
        killer_or_core_secret: "老船长伪造航线记录以隐藏保险骗局。",
        timeline: [
          {
            id: "truth_ledger",
            title: "账本被调换",
            summary: "老船长在停电时调换了真正的账本。",
            actor_ids: ["captain"],
            reveals_truth_ids: [],
          },
        ],
      },
      characters: [
        {
          id: "captain",
          name: "老船长",
          public_profile: "熟悉雾港航线的退休船长。",
          private_secret: "参与过沉船保险骗局。",
          goal: "阻止账本被公开。",
          fear: "旧案牵出自己的伪证。",
          arc: "从强硬否认到承认调换账本。",
          relations: [],
        },
      ],
      clues: [
        {
          id: "ledger",
          title: "潮湿账本",
          content: "账本边缘有新鲜海水痕迹，页码顺序被重新装订。",
          source_character_ids: ["captain"],
          reveals_truth_ids: ["truth_ledger"],
          red_herring: false,
        },
      ],
      acts: [
        {
          id: "act1",
          title: "雾夜登船",
          goal: "确认账本为何出现在码头仓库。",
          scene_seeds: ["码头仓库", "停电后的船舱", "被擦掉的航线图"],
        },
      ],
      endings: [
        {
          id: "truth",
          title: "真相公开",
          condition: "玩家指出账本被老船长调换。",
          summary: "老船长承认调换账本，沉船保险骗局被重新调查。",
        },
      ],
    },
    null,
    2,
  );
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
