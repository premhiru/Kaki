import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export const KAKI_CONFIG_VERSION = 1;

export interface KakiPaths {
  readonly home: string;
  readonly config: string;
  readonly delivery: string;
  readonly memory: string;
  readonly skills: string;
  readonly traces: string;
}

/** Resolve all runtime paths from one explicit root. Nothing writes to the legacy namespace. */
export function resolveKakiHome(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.KAKI_HOME?.trim();
  if (!configured) return join(homedir(), ".kaki");
  return isAbsolute(configured) ? configured : resolve(configured);
}

export function kakiPaths(env: NodeJS.ProcessEnv = process.env): KakiPaths {
  const home = resolveKakiHome(env);
  return {
    home,
    config: join(home, "config.json"),
    delivery: join(home, "delivery"),
    memory: join(home, "memory", "kaki.db"),
    skills: join(home, "skills"),
    traces: join(home, "traces"),
  };
}

export interface KakiConfig {
  readonly version: typeof KAKI_CONFIG_VERSION;
  readonly locale: string;
  readonly extraChannels: boolean;
}

export function defaultConfig(): KakiConfig {
  return { version: KAKI_CONFIG_VERSION, locale: "sg", extraChannels: false };
}
