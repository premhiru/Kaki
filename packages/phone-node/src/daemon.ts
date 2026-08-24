import { EventEmitter } from "node:events";
import type { AdbHealth } from "./adb-transport.js";
import {
  PhoneAgent,
  type PhoneAction,
  type TraceSink,
  type VisionDecision,
  type VisionPlanner,
} from "./index.js";

export interface PhoneTransport {
  screenshot(): Promise<Uint8Array>;
  dumpUi(): Promise<string | undefined>;
  act(action: PhoneAction): Promise<void>;
  backToHome(): Promise<void>;
  screenOn(): Promise<void>;
  health(): Promise<AdbHealth>;
  reconnect(): Promise<AdbHealth>;
}

export interface GatewayNodeRegistration {
  readonly id: string;
  readonly kind: "phone";
  readonly capabilities: readonly string[];
}

export interface PhoneGateway {
  register(
    registration: GatewayNodeRegistration,
    execute: (request: PhoneTaskRequest) => Promise<PhoneTaskResult>,
  ): Promise<() => Promise<void>>;
  health(nodeId: string, health: AdbHealth): Promise<void>;
}

export interface PhoneTaskRequest {
  readonly taskId: string;
  readonly goal: string;
}

export interface PhoneTaskResult {
  readonly taskId: string;
  readonly decision: VisionDecision;
  readonly traceId: string;
}

export class PhoneNodeDaemon extends EventEmitter {
  private timer: NodeJS.Timeout | undefined;
  private unregister: (() => Promise<void>) | undefined;
  private running = false;

  public constructor(
    private readonly options: {
      nodeId: string;
      transport: PhoneTransport;
      planner: VisionPlanner;
      traces: TraceSink;
      gateway?: PhoneGateway;
      healthIntervalMs?: number;
      stepBudget?: number;
    },
  ) {
    super();
  }

  public async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    await this.ensureHealthy();
    await this.options.transport.screenOn();
    if (this.options.gateway) {
      this.unregister = await this.options.gateway.register(
        {
          id: this.options.nodeId,
          kind: "phone",
          capabilities: [
            "screenshot",
            "tap",
            "long_press",
            "swipe",
            "type",
            "key",
            "launch",
            "intent",
            "clipboard",
            "dump_ui",
            "wait_for",
            "notifications",
            "back_to_home",
          ],
        },
        (request) => this.execute(request),
      );
    }
    this.scheduleHealth();
  }

  public async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    await this.unregister?.();
    this.unregister = undefined;
  }

  public async execute(request: PhoneTaskRequest): Promise<PhoneTaskResult> {
    await this.ensureHealthy();
    const agent = new PhoneAgent(
      this.options.transport,
      this.options.planner,
      this.options.traces,
      this.options.stepBudget ?? 40,
    );
    this.emit("task:start", request);
    const decision = await agent.execute(request.taskId, request.goal);
    const result = { taskId: request.taskId, decision, traceId: request.taskId };
    this.emit("task:complete", result);
    return result;
  }

  public async health(): Promise<AdbHealth> {
    return this.options.transport.health();
  }

  private async ensureHealthy(): Promise<AdbHealth> {
    let health = await this.options.transport.health();
    if (!health.connected) health = await this.options.transport.reconnect();
    if (!health.connected) throw new Error(`Phone unavailable: ${health.state}`);
    return health;
  }

  private scheduleHealth(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      void this.pollHealth().finally(() => this.scheduleHealth());
    }, this.options.healthIntervalMs ?? 30_000);
    this.timer.unref();
  }

  private async pollHealth(): Promise<void> {
    let health = await this.options.transport.health();
    if (!health.connected) {
      this.emit("disconnect", health);
      health = await this.options.transport.reconnect();
      if (health.connected) this.emit("reconnect", health);
    }
    await this.options.gateway?.health(this.options.nodeId, health);
    this.emit("health", health);
  }
}
