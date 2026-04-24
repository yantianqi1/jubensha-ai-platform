import { describe, expect, it } from "vitest";
import { canAccessAnyScope, canAccessScope } from "./visibility.js";

const systemRequester = { kind: "system", value: "runtime" } as const;
const roleRequester = { kind: "role", value: "butler" } as const;
const seatRequester = { kind: "seat", value: "seat-1" } as const;
const groupRequester = { kind: "group", value: "group-a" } as const;

describe("visibility helpers", () => {
  it("allows public access", () => {
    expect(canAccessScope({ kind: "public", value: "all" }, roleRequester)).toBe(true);
  });

  it("allows exact role access", () => {
    expect(canAccessScope({ kind: "role", value: "butler" }, roleRequester)).toBe(true);
  });

  it("denies mismatched role access", () => {
    expect(canAccessScope({ kind: "role", value: "doctor" }, roleRequester)).toBe(false);
  });

  it("allows exact seat access", () => {
    expect(canAccessScope({ kind: "seat", value: "seat-1" }, seatRequester)).toBe(true);
  });

  it("allows exact group access", () => {
    expect(canAccessScope({ kind: "group", value: "group-a" }, groupRequester)).toBe(true);
  });

  it("allows system access only for system requester", () => {
    expect(canAccessScope({ kind: "system", value: "runtime" }, systemRequester)).toBe(true);
    expect(canAccessScope({ kind: "system", value: "runtime" }, roleRequester)).toBe(false);
  });

  it("allows any matching scope from a list", () => {
    expect(
      canAccessAnyScope(
        [
          { kind: "role", value: "doctor" },
          { kind: "group", value: "group-a" },
        ],
        groupRequester,
      ),
    ).toBe(true);
  });
});
