import { OpenAiCompatibleModelProvider } from "../generation/openai-compatible-model-provider.js";

export interface ModelJsonInput {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly jsonMode: boolean;
}

export interface CreationModelProvider {
  completeJson(input: ModelJsonInput): Promise<string>;
}

export function createCreationModelProviderFromEnv(env: NodeJS.ProcessEnv): CreationModelProvider {
  if (env.MODEL_PROVIDER === "scripted-demo") {
    return new ScriptedCreationModelProvider();
  }

  if (env.MODEL_PROVIDER === "openai-compatible") {
    return new OpenAiCompatibleModelProvider({
      baseUrl: readRequiredEnv(env, "OPENAI_COMPATIBLE_BASE_URL"),
      apiKey: readRequiredEnv(env, "OPENAI_API_KEY"),
      model: readRequiredEnv(env, "OPENAI_COMPATIBLE_MODEL"),
    });
  }

  throw new Error("MODEL_PROVIDER must be openai-compatible or scripted-demo");
}

class ScriptedCreationModelProvider implements CreationModelProvider {
  async completeJson(input: ModelJsonInput): Promise<string> {
    if (input.userPrompt.includes("plan_story_bible")) {
      return JSON.stringify(createDemoStoryBible());
    }

    if (input.userPrompt.includes("review_story_bible")) {
      return JSON.stringify({ diagnostics: [] });
    }

    throw new Error("Scripted creation provider received unsupported task");
  }
}

function createDemoStoryBible() {
  return {
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
    characters: [createDemoCharacter()],
    clues: [createDemoClue()],
    acts: [createDemoAct()],
    endings: [createDemoEnding()],
  };
}

function createDemoCharacter() {
  return {
    id: "captain",
    name: "老船长",
    public_profile: "熟悉雾港航线的退休船长。",
    private_secret: "参与过沉船保险骗局。",
    goal: "阻止账本被公开。",
    fear: "旧案牵出自己的伪证。",
    arc: "从强硬否认到承认调换账本。",
    relations: [],
  };
}

function createDemoClue() {
  return {
    id: "ledger",
    title: "潮湿账本",
    content: "账本边缘有新鲜海水痕迹，页码顺序被重新装订。",
    source_character_ids: ["captain"],
    reveals_truth_ids: ["truth_ledger"],
    red_herring: false,
  };
}

function createDemoAct() {
  return {
    id: "act1",
    title: "雾夜登船",
    goal: "确认账本为何出现在码头仓库。",
    scene_seeds: ["码头仓库", "停电后的船舱", "被擦掉的航线图"],
  };
}

function createDemoEnding() {
  return {
    id: "truth",
    title: "真相公开",
    condition: "玩家指出账本被老船长调换。",
    summary: "老船长承认调换账本，沉船保险骗局被重新调查。",
  };
}

function readRequiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}
