import type { HouseholdKeyBroker } from "@kaki/memory";
import type { Command } from "commander";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { resolveSecretRefValues, type SecretRef } from "openclaw/plugin-sdk/secret-ref-runtime";
import {
  KAKI_BOOTSTRAP_KEY,
  KAKI_BOOTSTRAP_NAMESPACE,
  createKakiBootstrapRecord,
  parseKakiOnboardingInput,
  type KakiBootstrapRecord,
} from "./onboarding-state.js";

const MAX_INPUT_BYTES = 1024 * 1024;
const refKey = (ref: SecretRef) => `${ref.source}:${ref.provider}:${ref.id}`;

export async function readBoundedJsonInput(
  source: AsyncIterable<Uint8Array | string> = process.stdin,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of source) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += bytes.byteLength;
    if (byteLength > MAX_INPUT_BYTES) throw new Error("kaki-onboard-input-too-large");
    chunks.push(bytes);
  }
  return JSON.parse(Buffer.concat(chunks, byteLength).toString("utf8")) as unknown;
}

export function registerKakiOnboardingCli(
  program: Command,
  api: Pick<OpenClawPluginApi, "runtime" | "config">,
): void {
  program
    .command("kaki-bootstrap")
    .description("Provision validated encrypted Kaki onboarding state")
    .command("provision")
    .description("Read a complete onboarding payload from stdin")
    .requiredOption("--stdin", "Read the payload from standard input")
    .option("--json", "Emit machine-readable non-secret output")
    .action(async (options: { stdin: boolean; json?: boolean }) => {
      if (!options.stdin) throw new Error("kaki-onboard-stdin-required");
      const input = parseKakiOnboardingInput(await readBoundedJsonInput());
      const refs = Object.values(input.secretRefs);
      const resolved = await resolveSecretRefValues(refs, { config: api.config });
      for (const ref of refs) {
        const value = resolved.get(refKey(ref));
        if (typeof value !== "string" || value.length === 0) {
          throw new Error(
            `kaki-onboard-secret-ref-unavailable:${ref.source}:${ref.provider}:${ref.id}`,
          );
        }
      }
      const memoryRef = input.secretRefs.householdMemoryKey;
      const broker: HouseholdKeyBroker = {
        async getHouseholdKey() {
          const encoded = resolved.get(refKey(memoryRef));
          if (typeof encoded !== "string") throw new Error("kaki-memory-key-unavailable");
          const key = Buffer.from(encoded, "base64url");
          if (key.byteLength !== 32 || key.toString("base64url") !== encoded.replaceAll("=", "")) {
            key.fill(0);
            throw new Error("kaki-memory-key-invalid");
          }
          const copy = new Uint8Array(key);
          key.fill(0);
          return copy;
        },
      };
      const record = await createKakiBootstrapRecord(input, broker);
      const store = api.runtime.state.openKeyedStore<KakiBootstrapRecord>({
        namespace: KAKI_BOOTSTRAP_NAMESPACE,
        maxEntries: 1,
        overflowPolicy: "reject-new",
      });
      await store.register(KAKI_BOOTSTRAP_KEY, record);
      process.stdout.write(`${JSON.stringify({ ok: true, config: input.config })}\n`);
    });
}
