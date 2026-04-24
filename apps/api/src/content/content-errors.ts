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
