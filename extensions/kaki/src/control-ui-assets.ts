import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isRecord } from "openclaw/plugin-sdk/string-coerce-runtime";

export const KAKI_CONTROL_UI_PATH = "/plugins/kaki/control";

type AssetManifest = {
  routePrefix: string;
  files: Record<string, { bytes: number; sha256: string }>;
};

function parseManifest(value: unknown): AssetManifest {
  if (!isRecord(value) || typeof value.routePrefix !== "string" || !isRecord(value.files)) {
    throw new Error("kaki-control-ui-manifest-invalid");
  }
  const files: AssetManifest["files"] = {};
  for (const [path, metadata] of Object.entries(value.files)) {
    if (
      !path.startsWith("/") ||
      !isRecord(metadata) ||
      typeof metadata.bytes !== "number" ||
      !Number.isSafeInteger(metadata.bytes) ||
      metadata.bytes < 0 ||
      typeof metadata.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/u.test(metadata.sha256)
    ) {
      throw new Error("kaki-control-ui-manifest-invalid");
    }
    files[path] = { bytes: metadata.bytes, sha256: metadata.sha256 };
  }
  return { routePrefix: value.routePrefix, files };
}

function loadAssets(rootDir?: string) {
  const assetsUrl = rootDir
    ? pathToFileURL(`${path.join(rootDir, "assets", "control-ui")}${path.sep}`)
    : new URL("../assets/control-ui/", import.meta.url);
  const manifest = parseManifest(
    JSON.parse(readFileSync(new URL("manifest.json", assetsUrl), "utf8")),
  );
  if (manifest.routePrefix !== KAKI_CONTROL_UI_PATH) {
    throw new Error("kaki-control-ui-route-mismatch");
  }
  return new Map(
    Object.entries(manifest.files).map(([assetPath, metadata]) => [
      assetPath,
      {
        body: readFileSync(new URL(assetPath.slice(1), assetsUrl)),
        etag: `"${metadata.sha256}"`,
      },
    ]),
  );
}

export function createKakiControlUiAssetHandler(options: { rootDir?: string } = {}) {
  // Plugin assets are immutable for the process lifetime. Defer the bounded read until
  // the HTTP surface is used so command-only activation does not depend on UI packaging.
  let assets: ReturnType<typeof loadAssets> | undefined;
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.end("Method Not Allowed");
      return true;
    }
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    const relative = pathname.slice(KAKI_CONTROL_UI_PATH.length);
    const key = relative === "" || relative === "/" ? "/index.html" : relative;
    assets ??= loadAssets(options.rootDir);
    const asset = assets.get(key);
    if (!asset) {
      res.statusCode = 404;
      res.end("Not Found");
      return true;
    }
    setSecurityHeaders(res);
    res.setHeader("Content-Type", contentType(key));
    res.setHeader("ETag", asset.etag);
    res.setHeader(
      "Cache-Control",
      key === "/index.html" ? "no-store" : "private, max-age=31536000, immutable",
    );
    if (req.headers["if-none-match"] === asset.etag) {
      res.statusCode = 304;
      res.end();
      return true;
    }
    res.statusCode = 200;
    res.setHeader("Content-Length", asset.body.byteLength);
    res.end(req.method === "HEAD" ? undefined : asset.body);
    return true;
  };
}

function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; base-uri 'none'; connect-src 'self'; font-src 'self'; frame-ancestors 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  );
}

function contentType(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml; charset=utf-8";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}
