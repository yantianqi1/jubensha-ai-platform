import { buildNpcPrompt } from "./npc-prompt-builder.js";
import { parseProviderNpcResponse } from "./generation-errors.js";
import type { NpcResponse } from "./npc-response-schema.js";
import type { ModelProvider } from "./model-provider.js";
import type { ScriptVersionRecord } from "../content/content-repository.js";
import type { RuntimeRoomRecord } from "../runtime/runtime-repository.js";

export interface GenerationRoomReader {
  getRoom(roomId: string): Promise<RuntimeRoomRecord>;
}

export interface ReleasedVersionReader {
  getReleasedVersion(versionId: string): Promise<ScriptVersionRecord>;
}

export interface AskNpcInput {
  readonly roomId: string;
  readonly npcCode: string;
  readonly message: string;
}

export interface GenerationServiceOptions {
  readonly runtimeReader: GenerationRoomReader;
  readonly versionReader: ReleasedVersionReader;
  readonly modelProvider: ModelProvider;
}

export class GenerationService {
  constructor(private readonly options: GenerationServiceOptions) {}

  async askNpc(input: AskNpcInput): Promise<NpcResponse> {
    const room = await this.options.runtimeReader.getRoom(input.roomId);
    const version = await this.options.versionReader.getReleasedVersion(room.versionId);
    const prompt = buildNpcPrompt({
      scriptPackage: version.content,
      state: room.state,
      sceneCode: room.currentSceneCode,
      npcCode: input.npcCode,
      playerMessage: input.message,
    });
    const output = await this.options.modelProvider.completeJson(prompt);

    return parseProviderNpcResponse(output);
  }
}
