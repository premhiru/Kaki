import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createKakiControlUiAssetHandler, KAKI_CONTROL_UI_PATH } from "./control-ui-assets.js";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function start(rootDir?: string) {
  const handler = createKakiControlUiAssetHandler({ rootDir });
  const server = createServer((req, res) => void handler(req, res));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}${KAKI_CONTROL_UI_PATH}`;
}

describe("Kaki packaged control UI", () => {
  it("serves immutable manifest-bound assets with browser isolation headers", async () => {
    const base = await start(fileURLToPath(new URL("..", import.meta.url)));
    const index = await fetch(base);
    expect(index.status).toBe(200);
    expect(index.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(index.headers.get("cache-control")).toBe("no-store");
    expect(index.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(index.headers.get("x-content-type-options")).toBe("nosniff");
    expect(index.headers.get("cross-origin-resource-policy")).toBe("same-origin");
    expect(await index.text()).toContain("<html");

    const etag = index.headers.get("etag")!;
    const unchanged = await fetch(base, { headers: { "if-none-match": etag } });
    expect(unchanged.status).toBe(304);
    expect(await unchanged.text()).toBe("");

    const head = await fetch(`${base}/favicon.svg`, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect(head.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(head.headers.get("cache-control")).toContain("immutable");
    expect(await head.text()).toBe("");

    const manifest = JSON.parse(
      await readFile(new URL("../assets/control-ui/manifest.json", import.meta.url), "utf8"),
    ) as { files: Record<string, unknown> };
    const contentTypes = new Map([
      [".js", "text/javascript; charset=utf-8"],
      [".css", "text/css; charset=utf-8"],
      [".png", "image/png"],
      [".woff2", "font/woff2"],
    ]);
    for (const [suffix, expected] of contentTypes) {
      const path = Object.keys(manifest.files).find((candidate) => candidate.endsWith(suffix));
      expect(path, `manifest asset ending ${suffix}`).toBeDefined();
      const response = await fetch(`${base}${path}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe(expected);
    }
  });

  it("fails closed for methods and assets outside the packaged manifest", async () => {
    const base = await start();
    const method = await fetch(base, { method: "POST" });
    expect(method.status).toBe(405);
    expect(method.headers.get("allow")).toBe("GET, HEAD");
    expect(await method.text()).toBe("Method Not Allowed");
    const missing = await fetch(`${base}/not-packaged.js`);
    expect(missing.status).toBe(404);
    expect(await missing.text()).toBe("Not Found");
  });
});
