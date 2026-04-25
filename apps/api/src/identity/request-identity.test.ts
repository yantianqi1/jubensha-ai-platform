import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { requireOperator, requirePlayer } from "./request-identity.js";

describe("request identity", () => {
  it("reads operator identity from explicit headers", () => {
    expect(requireOperator({ "x-operator-id": "operator_1" })).toEqual({ actorId: "operator_1", actorType: "operator" });
  });

  it("rejects missing operator identity", () => {
    expect(() => requireOperator({})).toThrow(UnauthorizedException);
  });

  it("reads player identity and enforces body/header match", () => {
    expect(requirePlayer({ "x-player-id": "player_a" }, "player_a")).toEqual({ actorId: "player_a", actorType: "player" });
  });

  it("rejects mismatched player identity", () => {
    expect(() => requirePlayer({ "x-player-id": "player_a" }, "player_b")).toThrow(ForbiddenException);
  });
});
