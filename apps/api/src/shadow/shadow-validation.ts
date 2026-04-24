import type { ScriptPackage } from "@jubensha/dsl";
import { canAccessAnyScope } from "@jubensha/dsl";
import type { RuntimeState } from "@jubensha/dsl";
import type { NpcProposal } from "../generation/npc-response-schema.js";

export type ShadowValidationCode =
  | "accepted"
  | "unknown_clue"
  | "visibility_denied"
  | "unknown_flag"
  | "unknown_npc";

export interface ShadowValidationResult {
  readonly accepted: boolean;
  readonly code: ShadowValidationCode;
  readonly path: string;
  readonly message: string;
}

export interface NpcShadowValidation {
  readonly accepted: boolean;
  readonly results: readonly ShadowValidationResult[];
}

export interface ValidateNpcProposalsInput {
  readonly scriptPackage: ScriptPackage;
  readonly state: RuntimeState;
  readonly npcCode: string;
  readonly proposals: readonly NpcProposal[];
}

export function validateNpcProposals(input: ValidateNpcProposalsInput): NpcShadowValidation {
  const results = input.proposals.flatMap((proposal, index) =>
    validateProposal(proposal, input, `proposals[${index}]`),
  );

  return {
    accepted: results.every((result) => result.accepted),
    results,
  };
}

function validateProposal(
  proposal: NpcProposal,
  input: ValidateNpcProposalsInput,
  path: string,
): ShadowValidationResult[] {
  if (proposal.type === "reveal_clue") {
    return validateRevealClue(proposal.clue_code, input, path);
  }

  if (proposal.type === "set_flag") {
    return validateSetFlag(proposal.flag, input, path);
  }

  if (proposal.type === "npc_event") {
    return validateNpcEvent(proposal.npc_code, input, path);
  }

  return [];
}

function validateRevealClue(
  clueCode: string,
  input: ValidateNpcProposalsInput,
  path: string,
): ShadowValidationResult[] {
  const clue = input.scriptPackage.clues.find((candidate) => candidate.clue_code === clueCode);

  if (!clue) {
    return [createResult(false, "unknown_clue", `${path}.clue_code`, `Missing clue reference: ${clueCode}`)];
  }

  if (!canAccessAnyScope(clue.initial_visibility, { kind: "role", value: input.npcCode })) {
    return [
      createResult(
        false,
        "visibility_denied",
        `${path}.clue_code`,
        `Visibility denied for clue: ${clueCode}`,
      ),
    ];
  }

  return [createResult(true, "accepted", path, `Accepted clue reveal: ${clueCode}`)];
}

function validateSetFlag(
  flag: string,
  input: ValidateNpcProposalsInput,
  path: string,
): ShadowValidationResult[] {
  if (!(flag in input.state.flags)) {
    return [createResult(false, "unknown_flag", `${path}.flag`, `Missing flag reference: ${flag}`)];
  }

  return [createResult(true, "accepted", path, `Accepted flag change: ${flag}`)];
}

function validateNpcEvent(
  npcCode: string,
  input: ValidateNpcProposalsInput,
  path: string,
): ShadowValidationResult[] {
  const roleExists = input.scriptPackage.roles.some((role) => role.role_code === npcCode);

  if (!roleExists) {
    return [createResult(false, "unknown_npc", `${path}.npc_code`, `Missing role reference: ${npcCode}`)];
  }

  return [createResult(true, "accepted", path, `Accepted NPC event: ${npcCode}`)];
}

function createResult(
  accepted: boolean,
  code: ShadowValidationCode,
  path: string,
  message: string,
): ShadowValidationResult {
  return { accepted, code, path, message };
}
