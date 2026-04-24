import { Controller, Get, Header } from "@nestjs/common";

const HOME_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>剧本杀游戏平台 MVP</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f4ee;
      color: #1d2329;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
    }
    main {
      width: min(880px, calc(100vw - 32px));
      display: grid;
      gap: 20px;
    }
    h1 {
      margin: 0;
      font-size: 36px;
      line-height: 1.15;
    }
    p {
      margin: 0;
      color: #56616d;
      line-height: 1.7;
    }
    button {
      width: fit-content;
      min-height: 44px;
      border: 0;
      border-radius: 8px;
      padding: 0 18px;
      background: #126b63;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }
    pre {
      margin: 0;
      overflow: auto;
      min-height: 220px;
      padding: 18px;
      border: 1px solid #d7d1c6;
      border-radius: 8px;
      background: #ffffff;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <main>
    <h1>剧本杀游戏平台 MVP</h1>
    <p>当前版本可完成内容草稿创建、发布不可变版本、创建运行房间、执行场景动作并记录事件。</p>
    <button id="run-demo" type="button">运行雾港失踪案演示</button>
    <pre id="output">POST /demo/fog-harbor</pre>
  </main>
  <script>
    const button = document.querySelector("#run-demo");
    const output = document.querySelector("#output");
    button.addEventListener("click", async () => {
      output.textContent = "Running...";
      const response = await fetch("/demo/fog-harbor", { method: "POST" });
      const body = await response.json();
      output.textContent = JSON.stringify(body, null, 2);
    });
  </script>
</body>
</html>`;

@Controller("/")
export class HomeController {
  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  getHome(): string {
    return HOME_HTML;
  }
}
