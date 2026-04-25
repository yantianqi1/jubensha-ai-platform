import type { PackageDiagnostic } from "@jubensha/dsl";

export class ContentValidationError extends Error {
  readonly diagnostics: readonly PackageDiagnostic[];

  constructor(message: string, diagnostics: readonly PackageDiagnostic[]) {
    super(message);
    this.name = "ContentValidationError";
    this.diagnostics = diagnostics;
  }
}

export class ContentConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentConflictError";
  }
}

export class ContentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentNotFoundError";
  }
}

export interface ContentPublishBlocker {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export class ContentPublishBlockedError extends Error {
  readonly blockers: readonly ContentPublishBlocker[];

  constructor(message: string, blockers: readonly ContentPublishBlocker[]) {
    super(message);
    this.name = "ContentPublishBlockedError";
    this.blockers = blockers;
  }
}
