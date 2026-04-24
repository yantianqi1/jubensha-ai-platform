import { describe, expect, it } from "vitest";

import { readApiPort, readCorsOrigins } from "./app-config.js";

describe("app config", () => {
  it("includes local web dev origins by default", () => {
    expect(readCorsOrigins({})).toEqual([
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
  });

  it("expands loopback CORS origins to localhost and 127.0.0.1", () => {
    expect(readCorsOrigins({ CORS_ORIGINS: "http://127.0.0.1:5173,https://example.test" })).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://example.test",
    ]);
  });

  it("reads a valid API port", () => {
    expect(readApiPort({ API_PORT: "3010" })).toBe(3010);
  });

  it("rejects invalid API ports", () => {
    expect(() => readApiPort({ API_PORT: "invalid" })).toThrow("API_PORT must be a positive integer");
  });
});
