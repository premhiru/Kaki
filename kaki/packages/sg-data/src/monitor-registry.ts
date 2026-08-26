import { evaluateMonitor, type MonitorKind, type MonitorSignal } from "./monitors.js";

export interface MonitorDefinition {
  readonly id: string;
  readonly kind: MonitorKind;
  readonly intervalMs: number;
  collect(signal?: AbortSignal): Promise<Record<string, unknown>>;
}

export interface MonitorNotificationSink {
  notify(monitorId: string, signal: MonitorSignal): Promise<void>;
}

export interface MonitorDedupeStore {
  has(key: string): Promise<boolean>;
  record(key: string): Promise<void>;
}

export class MemoryMonitorDedupeStore implements MonitorDedupeStore {
  private readonly keys = new Set<string>();
  async has(key: string): Promise<boolean> {
    return this.keys.has(key);
  }
  async record(key: string): Promise<void> {
    this.keys.add(key);
  }
}

export class SingaporeMonitorRegistry {
  private readonly monitors = new Map<string, MonitorDefinition>();

  register(definition: MonitorDefinition): void {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(definition.id)) {
      throw new Error("invalid-monitor-id");
    }
    if (!Number.isFinite(definition.intervalMs) || definition.intervalMs < 60_000) {
      throw new Error("monitor-interval-too-short");
    }
    if (this.monitors.has(definition.id)) throw new Error("duplicate-monitor-id");
    this.monitors.set(definition.id, definition);
  }

  list(): readonly Pick<MonitorDefinition, "id" | "kind" | "intervalMs">[] {
    return [...this.monitors.values()]
      .map(({ id, kind, intervalMs }) => ({ id, kind, intervalMs }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  get(id: string): MonitorDefinition | undefined {
    return this.monitors.get(id);
  }
}

export interface HeartbeatScheduler {
  every(id: string, intervalMs: number, run: () => Promise<void>): () => void;
}

export interface MonitorEvaluationAdapter {
  /** The host may route this bounded fact object to its configured cheap model. */
  evaluate(kind: MonitorKind, facts: Record<string, unknown>): Promise<MonitorSignal>;
}

const deterministicMonitorEvaluator: MonitorEvaluationAdapter = {
  evaluate: async (kind, facts) => evaluateMonitor(kind, facts),
};

/** The scheduler only evaluates compact facts; collection/model choice remains injected. */
export class SingaporeMonitorRunner {
  private readonly stopCallbacks: (() => void)[] = [];

  constructor(
    private readonly registry: SingaporeMonitorRegistry,
    private readonly scheduler: HeartbeatScheduler,
    private readonly notifications: MonitorNotificationSink,
    private readonly dedupe: MonitorDedupeStore = new MemoryMonitorDedupeStore(),
    private readonly evaluator: MonitorEvaluationAdapter = deterministicMonitorEvaluator,
  ) {}

  start(): void {
    if (this.stopCallbacks.length) throw new Error("monitor-runner-already-started");
    for (const summary of this.registry.list()) {
      this.stopCallbacks.push(
        this.scheduler.every(summary.id, summary.intervalMs, async () => {
          await this.runOnce(summary.id);
        }),
      );
    }
  }

  stop(): void {
    for (const stop of this.stopCallbacks.splice(0)) stop();
  }

  async runOnce(id: string, signal?: AbortSignal): Promise<MonitorSignal> {
    const monitor = this.registry.get(id);
    if (!monitor) throw new Error("unknown-monitor-id");
    const result = await this.evaluator.evaluate(monitor.kind, await monitor.collect(signal));
    const key = `${id}:${result.dedupeKey}`;
    if (result.shouldNotify && !(await this.dedupe.has(key))) {
      await this.notifications.notify(id, result);
      await this.dedupe.record(key);
    }
    return result;
  }
}
