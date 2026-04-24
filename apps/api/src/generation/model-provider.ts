export interface ModelCompletionInput {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly jsonMode: boolean;
}

export interface ModelProvider {
  completeJson(input: ModelCompletionInput): Promise<string>;
}
