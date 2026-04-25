export function renderPlayControls(): string {
  return `<section class="controls panel" aria-labelledby="controls-title">
  <h2 id="controls-title">操作入口</h2>
  <div class="control-row">
    <label>API 基础地址<input data-base-url type="url" value="http://127.0.0.1:3001" /></label>
    <button data-action="start-demo">启动雾港 demo</button>
  </div>
  <div class="control-row">
    <label>Version ID<input data-runtime-field="versionId" type="text" placeholder="version_..." /></label>
    <label>座位数<input data-runtime-field="seatCount" type="number" min="1" value="4" /></label>
    <button data-action="create-runtime-room">创建运行房间</button>
  </div>
  <div class="control-row">
    <label>房间 ID<input data-room-id type="text" placeholder="启动 demo 或创建房间后填入" /></label>
    <label>Seat ID<input data-runtime-field="seatId" type="text" value="seat_1" /></label>
    <label>Player ID<input data-runtime-field="playerId" type="text" value="player_alpha" /></label>
    <button data-action="join-seat">入座</button>
  </div>
  <div class="control-row">
    <button data-action="read-public-snapshot">读取公开快照</button>
    <button data-action="read-seat-snapshot">读取座位快照</button>
  </div>
  <div class="control-row">
    <label>NPC 角色${renderNpcSelect()}</label>
    <label>盘问内容<input data-message type="text" value="窗台怎么回事？" /></label>
    <button data-action="ask-npc">盘问 NPC</button>
  </div>
  <div class="control-row">
    <label>Action Code<input data-runtime-field="actionCode" type="text" value="inspect_window" /></label>
    <label>Expected Revision<input data-runtime-field="expectedRevision" type="number" min="0" value="0" /></label>
    <button data-action="apply-room-action">提交运行时动作</button>
  </div>
  <p class="status" data-status>尚未连接 API。</p>
  <p class="status shadow" data-shadow-status>Shadow 校验未执行。</p>
  <pre data-runtime-snapshot>运行时快照等待读取。</pre>
</section>`;
}

function renderNpcSelect(): string {
  return `<select data-npc-code>
  <option value="butler">管家</option>
  <option value="doctor">医生</option>
</select>`;
}
