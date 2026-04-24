export class RuntimeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeNotFoundError";
  }
}

export class RuntimeRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeRuleError";
  }
}
