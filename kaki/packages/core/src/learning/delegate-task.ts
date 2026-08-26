export interface DelegatedTask<T> {
  readonly name: string;
  readonly run: (signal: AbortSignal) => Promise<T>;
}

export interface DelegatedResult<T> {
  readonly name: string;
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: string;
}

/** Runs bounded background fan-out and returns one consolidation-friendly result array. */
export async function delegateTasks<T>(
  tasks: readonly DelegatedTask<T>[],
  options: { concurrency?: number; signal?: AbortSignal } = {},
): Promise<DelegatedResult<T>[]> {
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 4));
  const controller = new AbortController();
  const abort = (): void => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  const results = new Array<DelegatedResult<T> | undefined>(tasks.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (!controller.signal.aborted) {
      const index = cursor++;
      const task = tasks[index];
      if (!task) return;
      try {
        results[index] = { name: task.name, ok: true, value: await task.run(controller.signal) };
      } catch (error) {
        results[index] = { name: task.name, ok: false, error: toErrorMessage(error) };
      }
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
    return results.filter((result): result is DelegatedResult<T> => result !== undefined);
  } finally {
    options.signal?.removeEventListener("abort", abort);
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
