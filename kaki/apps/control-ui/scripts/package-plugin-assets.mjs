import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const routePrefix = "/plugins/kaki/control";
const distUrl = new URL("../dist/", import.meta.url);
const outputUrl = new URL("../../../../extensions/kaki/assets/control-ui/", import.meta.url);
const localeSourceUrl = new URL("../../../packages/locale/", import.meta.url);
const localeOutputUrl = new URL("../../../../extensions/kaki/assets/locale/", import.meta.url);
const pluginPackageUrl = new URL("../../../../extensions/kaki/package.json", import.meta.url);
const files = {};
const localeFiles = [];

await rm(outputUrl, { recursive: true, force: true });
await mkdir(outputUrl, { recursive: true });
const workerUrl = new URL("server/index.js", distUrl);
workerUrl.searchParams.set("package", `${Date.now()}`);
const { default: worker } = await import(workerUrl.href);
const response = await worker.fetch(
  new Request("http://localhost/", {
    headers: { accept: "text/html", host: "localhost" },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);
if (!response.ok) throw new Error(`control-ui-render-failed:${response.status}`);
await emit("index.html", rewrite(await response.text()));

for (const source of ["client/_next/", "client/favicon.svg", "client/og.png"]) {
  await copy(new URL(source, distUrl), source.replace(/^client\//u, ""));
}
await writeFile(
  new URL("manifest.json", outputUrl),
  `${JSON.stringify({ routePrefix, files }, null, 2)}\n`,
);
await packageLocaleAssets();
await syncPluginPackageAssets();

async function copy(sourceUrl, relativePath) {
  relativePath = relativePath.replace(/\/+$/u, "");
  const entries = await readdir(sourceUrl, { withFileTypes: true }).catch(() => undefined);
  if (entries) {
    for (const entry of entries) {
      await copy(
        new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, sourceUrl),
        `${relativePath}/${entry.name}`,
      );
    }
    return;
  }
  const bytes = await readFile(sourceUrl);
  const text = /\.(?:css|html|js|json|svg)$/u.test(relativePath)
    ? Buffer.from(rewrite(bytes.toString("utf8")))
    : bytes;
  await emit(relativePath, text);
}

async function emit(relativePath, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const target = new URL(relativePath, outputUrl);
  await mkdir(new URL("./", target), { recursive: true });
  await writeFile(target, bytes);
  files[`/${relativePath}`] = {
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function syncPluginPackageAssets() {
  const packageJson = JSON.parse(await readFile(pluginPackageUrl, "utf8"));
  packageJson.openclaw ??= {};
  packageJson.openclaw.build ??= {};
  const controlUiAssets = [...Object.keys(files), "/manifest.json"].map((assetPath) => ({
    source: `./assets/control-ui${assetPath}`,
    output: `assets/control-ui${assetPath}`,
  }));
  const localeAssets = localeFiles.map((assetPath) => ({
    source: `./assets/locale/${assetPath}`,
    output: `assets/locale/${assetPath}`,
  }));
  packageJson.openclaw.build.staticAssets = [...controlUiAssets, ...localeAssets].toSorted(
    (left, right) => left.output.localeCompare(right.output),
  );
  await writeFile(pluginPackageUrl, `${JSON.stringify(packageJson, null, 2)}\n`);
}

async function packageLocaleAssets() {
  await rm(localeOutputUrl, { recursive: true, force: true });
  for (const locale of ["sg", "my", "id", "th", "vn", "ph", "mm", "kh"]) {
    for (const name of [
      "persona.md",
      "lexicon.json",
      "calendar.json",
      "formats.json",
      "dietary.json",
      "channels.json",
    ]) {
      const relativePath = `${locale}/${name}`;
      const target = new URL(relativePath, localeOutputUrl);
      await mkdir(new URL("./", target), { recursive: true });
      await writeFile(target, await readFile(new URL(relativePath, localeSourceUrl)));
      localeFiles.push(relativePath);
    }
  }
}

function rewrite(value) {
  return value
    .replaceAll("/_next/", `${routePrefix}/_next/`)
    .replaceAll('href="/favicon.svg"', `href="${routePrefix}/favicon.svg"`)
    .replaceAll('content="/og.png"', `content="${routePrefix}/og.png"`);
}

console.log(
  `Packaged ${Object.keys(files).length} immutable Kaki Control UI assets and ${localeFiles.length} locale assets at ${fileURLToPath(outputUrl)}`,
);
