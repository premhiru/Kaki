import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assets = new URL("../../../../extensions/kaki/assets/control-ui/", import.meta.url);

test("packages a manifest-bound same-origin client for the Kaki plugin tab", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", assets), "utf8"));
  assert.equal(manifest.routePrefix, "/plugins/kaki/control");
  assert.ok(Object.keys(manifest.files).length >= 10);
  for (const [path, expected] of Object.entries(manifest.files)) {
    assert.ok(path.startsWith("/"));
    const bytes = await readFile(new URL(path.slice(1), assets));
    assert.equal(bytes.byteLength, expected.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected.sha256);
  }

  const html = await readFile(new URL("index.html", assets), "utf8");
  assert.match(html, /\/plugins\/kaki\/control\/_next\/static\//);
  assert.doesNotMatch(html, /(?:https?:)?\/\/[^"']*chatgpt\.site/i);
  assert.doesNotMatch(html, /Grab to Raffles Place|Aircon servicing|Wei Ling/);
  for (const tab of [
    "Household",
    "Approvals",
    "Phone",
    "Journey",
    "Skills",
    "Locale",
    "Cost",
    "Traces",
    "Monitors",
  ]) {
    assert.match(html, new RegExp(`>${tab}<`));
  }
});
