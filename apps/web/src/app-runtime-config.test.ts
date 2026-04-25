import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "./app-runtime-config.js";

describe("app runtime config", () => {
  it("uses the current localhost host for the API", () => {
    expect(resolveApiBaseUrl({ protocol: "http:", hostname: "localhost" })).toBe("http://localhost:8888");
  });

  it("uses the current 127.0.0.1 host for the API", () => {
    expect(resolveApiBaseUrl({ protocol: "http:", hostname: "127.0.0.1" })).toBe("http://127.0.0.1:8888");
  });

  it("falls back from wildcard hosts to a browser-connectable API host", () => {
    expect(resolveApiBaseUrl({ protocol: "http:", hostname: "0.0.0.0" })).toBe("http://127.0.0.1:8888");
  });

  it("falls back for file pages", () => {
    expect(resolveApiBaseUrl({ protocol: "file:", hostname: "" })).toBe("http://127.0.0.1:8888");
  });
});
