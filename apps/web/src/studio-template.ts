import { renderScriptCreationJobPage } from "./script-creation-job-page.js";

export function renderStudioSurface(): string {
  return `<section class="studio-workspace" aria-labelledby="studio-workspace-title">
  <header class="studio-header">
    <div>
      <p class="eyebrow">Studio Web</p>
      <h2 class="studio-title" id="studio-workspace-title">剧情生成工作台</h2>
      <p>用真实 generation job 生成、审核并编译剧本草稿。</p>
    </div>
    <div class="studio-header__status">
      <span>当前任务</span>
      <strong data-studio-current-job>等待创建或加载</strong>
    </div>
  </header>
  <div class="studio-body">
    <aside class="brief-rail" aria-labelledby="brief-rail-title">
      ${renderBriefRail()}
      ${renderLegacyTools()}
    </aside>
    <section class="job-workspace" aria-label="Script creation job workspace">
      ${renderScriptCreationJobPage()}
    </section>
  </div>
</section>`;
}

function renderBriefRail(): string {
  return `<section class="brief-panel panel panel-compact" aria-labelledby="brief-rail-title">
  <div class="brief-panel__heading">
    <p class="eyebrow">Brief</p>
    <h3 id="brief-rail-title">创作输入</h3>
  </div>
  <div class="studio-form studio-form--rail">
    <label>标题<input data-studio-field="title" type="text" value="雾港新案" /></label>
    <label>题材<input data-studio-field="genre" type="text" value="mystery" /></label>
    <div class="studio-form__row">
      <label>人数<input data-studio-field="playerCount" type="number" min="1" value="4" /></label>
      <label>时长<input data-studio-field="durationMinutes" type="number" min="30" value="180" /></label>
    </div>
    <label>难度<input data-studio-field="difficulty" type="text" value="medium" /></label>
    <label>基调<input data-studio-field="tone" type="text" value="阴冷、克制、悬疑" /></label>
    <label>前提<textarea class="textarea-compact" data-studio-field="premise">雾港旧账引发失踪案。</textarea></label>
    <label>主题命题<textarea class="textarea-compact" data-studio-field="themeStatement">被隐瞒的旧债终会回到当事人身上。</textarea></label>
    <label class="checkbox-row"><input data-studio-field="supernaturalAllowed" type="checkbox" />允许超自然</label>
  </div>
  <div class="brief-actions">
    <button class="button-primary" data-action="script-job-create-run" type="button">创建并运行生成任务</button>
  </div>
</section>`;
}

function renderLegacyTools(): string {
  return `<details class="legacy-tools panel panel-debug">
  <summary>Advanced / Legacy tools</summary>
  ${renderLegacyStudioPanel()}
  ${renderCreationPanel()}
</details>`;
}

function renderLegacyStudioPanel(): string {
  return `<section class="studio-panel" aria-labelledby="studio-title">
  <div class="panel-heading panel-heading--compact">
    <div>
      <p class="eyebrow">Studio MVP</p>
      <h3 id="studio-title">旧版生成与调试</h3>
    </div>
    <div class="button-row button-row--secondary">
      <button class="button-ghost button-compact" data-action="generate-story-bible">生成剧情圣经</button>
      <button class="button-ghost button-compact" data-action="retry-story-bible">重试生成</button>
      <button class="button-ghost button-compact" data-action="compile-generated-story-bible">回填编译草稿</button>
    </div>
  </div>
  <p class="hint">保留旧版 Studio MVP 输出，供调试和 Admin handoff 使用。</p>
  <div class="studio-grid studio-grid--debug">
    <section><h4>生成尝试</h4><pre class="readable-output" data-studio-attempts>尚未生成。</pre></section>
    <section><h4>角色关系图</h4><pre class="readable-output" data-studio-relations>尚未生成。</pre></section>
    <section><h4>差异面板</h4><pre class="readable-output" data-studio-diff>尚未重试。</pre></section>
    <section>
      <h4>剧情骨架</h4>
      <p class="status" data-studio-skeleton-state>骨架等待生成。</p>
      <textarea data-studio-skeleton-editor spellcheck="false">尚未生成。</textarea>
    </section>
  </div>
</section>`;
}

function renderCreationPanel(): string {
  return `<section class="creation-panel" aria-labelledby="creation-title">
  <div class="panel-heading panel-heading--compact">
    <div>
      <p class="eyebrow">Raw JSON</p>
      <h3 id="creation-title">StoryBible 编译草稿</h3>
    </div>
    <button class="button-ghost button-compact" data-action="compile-story-bible">编译草稿</button>
  </div>
  <label>StoryBible JSON
    <textarea data-story-bible-input spellcheck="false">${escapeHtml(defaultStoryBibleJson())}</textarea>
  </label>
  <p class="status" data-creation-diagnostics>Flow diagnostics 尚未执行。</p>
  <pre class="readable-output" data-creation-output>等待编译 StoryBible。</pre>
</section>`;
}

function defaultStoryBibleJson(): string {
  return JSON.stringify(createDefaultStoryBible(), null, 2);
}

function createDefaultStoryBible() {
  return {
    meta: createDefaultMeta(),
    theme: createDefaultTheme(),
    truth: createDefaultTruth(),
    characters: [createDefaultCharacter()],
    clues: [createDefaultClue()],
    acts: [createDefaultAct()],
    endings: [createDefaultEnding()],
  };
}

function createDefaultMeta() {
  return { title: "雾港新案", genre: "mystery", player_count: 4, duration_minutes: 180, difficulty: "medium", supernatural_allowed: false };
}

function createDefaultTheme() {
  return { premise: "雾港码头的旧账本牵出一场失踪案。", theme_statement: "被隐瞒的旧债终会回到当事人身上。", tone: "阴冷、克制、悬疑" };
}

function createDefaultTruth() {
  return {
    core_case: "船主在雾夜失踪，现场只留下潮湿账本。",
    killer_or_core_secret: "老船长伪造航线记录以隐藏保险骗局。",
    timeline: [{ id: "truth_ledger", title: "账本被调换", summary: "老船长在停电时调换了真正的账本。", actor_ids: ["captain"], reveals_truth_ids: [] }],
  };
}

function createDefaultCharacter() {
  return { id: "captain", name: "老船长", public_profile: "熟悉雾港航线的退休船长。", private_secret: "参与过沉船保险骗局。", goal: "阻止账本被公开。", fear: "旧案牵出自己的伪证。", arc: "从强硬否认到承认调换账本。", relations: [] };
}

function createDefaultClue() {
  return { id: "ledger", title: "潮湿账本", content: "账本边缘有新鲜海水痕迹，页码顺序被重新装订。", source_character_ids: ["captain"], reveals_truth_ids: ["truth_ledger"], red_herring: false };
}

function createDefaultAct() {
  return { id: "act1", title: "雾夜登船", goal: "确认账本为何出现在码头仓库。", scene_seeds: ["码头仓库", "停电后的船舱", "被擦掉的航线图"] };
}

function createDefaultEnding() {
  return { id: "truth", title: "真相公开", condition: "玩家指出账本被老船长调换。", summary: "老船长承认调换账本，沉船保险骗局被重新调查。" };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
