import type { KakiControlSnapshot, KakiRuntimeOwners } from "./contracts.js";
import { projectSnapshot } from "./projection.js";

const OWNER_DEADLINE_MS = 10_000;

export async function withOwnerDeadline<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Kaki runtime owner timed out"));
    }, OWNER_DEADLINE_MS);
  });
  try {
    return await Promise.race([run(controller.signal), deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function readKakiSnapshot(
  owners: KakiRuntimeOwners,
  signal: AbortSignal,
): Promise<KakiControlSnapshot> {
  const [system, household, approvals, phone, journey, skills, locale, cost, traces, monitors] =
    await Promise.all([
      owners.system.snapshot(signal),
      owners.household.list(signal),
      owners.approvals.list(signal),
      owners.phone.snapshot(signal),
      owners.journeys.list(signal),
      owners.skills.list(signal),
      owners.locale.snapshot(signal),
      owners.costs.snapshot(signal),
      owners.traces.list(signal),
      owners.monitors.list(signal),
    ]);
  return projectSnapshot({
    system,
    household,
    approvals,
    phone,
    journey,
    skills,
    locale,
    cost,
    traces,
    monitors,
  });
}
