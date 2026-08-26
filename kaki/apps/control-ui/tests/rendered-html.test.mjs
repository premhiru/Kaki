import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html", host: "localhost" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Kaki household control centre", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Kaki · Household control centre<\/title>/i);
  assert.match(html, /Household control centre/);
  assert.match(html, /LIVE HOUSEHOLD GATEWAY/);
  assert.match(html, /Connecting to the authenticated Gateway/);
  assert.match(html, /Live data is not loaded/);
  assert.match(html, /No action requested/);
  assert.doesNotMatch(html, /Grab to Raffles Place|Aircon servicing|Wei Ling/);
  assert.match(html, /og\.png/);
});

test("keeps all requested control surfaces discoverable", async () => {
  const response = await render();
  const page = await response.text();
  for (const label of [
    "Household",
    "Approvals",
    "Phone",
    "Journey",
    "Skills",
    "Locale",
    "Cost",
    "Traces",
    "Monitors",
  ])
    assert.match(page, new RegExp(`>${label}<`));
  assert.match(page, /role="tablist"/);
  assert.match(page, /role="tabpanel"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /Gateway client unavailable|authenticated Gateway/);
  await access(new URL("../public/og.png", import.meta.url));
});
