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
  assert.match(html, /Good morning, Wei Ling/);
  assert.match(html, /Rain near school run/);
  assert.match(html, /Grab to Raffles Place/);
  assert.match(html, /Aircon servicing/);
  assert.match(html, /Privacy walls are on/);
  assert.match(html, /Live and manual control/);
  assert.match(html, /Journey is editable/);
  assert.match(html, /SKILL\.MD/);
  assert.match(html, /Monthly alert at \$20/);
  assert.match(html, /TRACE REPLAY/);
  assert.match(html, /Quiet hours 23:00–07:00/);
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
  await access(new URL("../public/og.png", import.meta.url));
});
