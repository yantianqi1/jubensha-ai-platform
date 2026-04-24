import { parseNpcResponse, type NpcResponse } from "./npc-response-schema.js";

export class GenerationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationValidationError";
  }
}

export function parseProviderNpcResponse(text: string): NpcResponse {
  try {
    return parseNpcResponse(JSON.parse(text));
  } catch (error) {
    throw new GenerationValidationError(readErrorMessage(error));
  }
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "NPC response validation failed";
}
