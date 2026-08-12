import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  }, { waitUntil() {}, passThroughOnException() {} });
}

test("server renders the evidence-first product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /PY股票AI操作盘/);
  assert.match(html, /可验证股票研究助手/);
  assert.match(html, /研究驾驶舱/);
  assert.match(html, /信号校准/);
  assert.match(html, /组合风险/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("product includes documentation and removes starter preview", async () => {
  const [readme, displayDoc, pkg] = await Promise.all([
    readFile(new URL("README.md", root), "utf8"),
    readFile(new URL("docs/产品展示说明.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(readme, /确定性评分/);
  assert.match(displayDoc, /面试演示路径/);
  assert.doesNotMatch(pkg, /react-loading-skeleton/);
});
