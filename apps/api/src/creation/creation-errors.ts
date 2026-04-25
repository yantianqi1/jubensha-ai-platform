export class CreationModelValidationError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "CreationModelValidationError";
    this.cause = cause;
  }
}
