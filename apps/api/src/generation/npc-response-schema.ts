import { z } from "zod";

export const NpcProposalSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("reveal_clue"),
    clue_code: z.string().min(1),
    reason: z.string().min(1),
  }),
  z.object({
    type: z.literal("set_flag"),
    flag: z.string().min(1),
    value: z.boolean(),
    reason: z.string().min(1),
  }),
  z.object({
    type: z.literal("npc_event"),
    npc_code: z.string().min(1),
    event: z.string().min(1),
    reason: z.string().min(1),
  }),
]);
export type NpcProposal = z.infer<typeof NpcProposalSchema>;

export const NpcResponseSchema = z.object({
  speech: z.string().min(1),
  proposals: z.array(NpcProposalSchema).default([]),
  confidence: z.number().min(0).max(1),
});
export type NpcResponse = z.infer<typeof NpcResponseSchema>;

export function parseNpcResponse(input: unknown): NpcResponse {
  return NpcResponseSchema.parse(input);
}

export function safeParseNpcResponse(input: unknown) {
  return NpcResponseSchema.safeParse(input);
}
