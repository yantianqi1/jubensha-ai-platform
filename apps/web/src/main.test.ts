import { describe, expect, it } from "vitest";
import { renderDemoPage } from "./main.js";

describe("web static entry rendering", () => {
  it("renders Studio as an addressable product surface", () => {
    const html = renderDemoPage("studio-web");

    expect(html).toContain('data-surface-shell="studio-web"');
    expect(html).toContain('data-surface-link="studio-web" aria-current="page"');
    expect(html).toContain("剧情生成工作台");
  });

  it("renders Admin as an addressable product surface", () => {
    const html = renderDemoPage("admin-web");

    expect(html).toContain('data-surface-shell="admin-web"');
    expect(html).toContain('data-surface-link="admin-web" aria-current="page"');
    expect(html).toContain("运营诊断");
  });
});
