import type { RuntimeState, ScriptClue, ScriptPackage } from "@jubensha/dsl";
import type { ModelCompletionInput } from "./model-provider.js";

export interface NpcPromptInput {
  readonly scriptPackage: ScriptPackage;
  readonly state: RuntimeState;
  readonly sceneCode: string;
  readonly npcCode: string;
  readonly playerMessage: string;
}

export function buildNpcPrompt(input: NpcPromptInput): ModelCompletionInput {
  const role = input.scriptPackage.roles.find(
    (candidate) => candidate.role_code === input.npcCode,
  );

  if (!role) {
    throw new Error(`Unknown NPC role: ${input.npcCode}`);
  }

  return {
    systemPrompt: [
      "你是剧本杀 NPC 演员，只能输出 JSON。",
      "JSON 字段：speech, confidence, proposals。",
      `剧本：${input.scriptPackage.title}`,
      `当前场景：${input.sceneCode}`,
      `当前阶段：${input.state.phase}`,
      `NPC：${role.name} (${role.role_code})`,
      `公开设定：${role.public_profile}`,
      `私密设定：${role.private_secret ?? "无"}`,
      `已揭示线索：${formatRevealedClues(input.scriptPackage, input.state)}`,
    ].join("\n"),
    userPrompt: input.playerMessage,
    jsonMode: true,
  };
}

function formatRevealedClues(scriptPackage: ScriptPackage, state: RuntimeState): string {
  const clues = scriptPackage.clues.filter((clue) => state.revealedClues.includes(clue.clue_code));

  if (clues.length === 0) {
    return "无";
  }

  return clues.map(formatClue).join("\n");
}

function formatClue(clue: ScriptClue): string {
  return `${clue.clue_code} ${clue.title}: ${clue.content}`;
}
