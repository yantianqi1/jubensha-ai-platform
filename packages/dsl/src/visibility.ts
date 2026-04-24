import type { ScopeRef } from "./schema.js";

export function canAccessScope(scope: ScopeRef, requester: ScopeRef): boolean {
  if (scope.kind === "public") {
    return true;
  }

  if (scope.kind !== requester.kind) {
    return false;
  }

  return scope.value === requester.value;
}

export function canAccessAnyScope(
  scopes: readonly ScopeRef[],
  requester: ScopeRef,
): boolean {
  return scopes.some((scope) => canAccessScope(scope, requester));
}
