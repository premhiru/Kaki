import type { AlertSink } from "./types.js";

export type SessionFailure = "logout" | "ban" | "rate-limit" | "network";
export type SessionState =
  | "stopped"
  | "connecting"
  | "linked"
  | "backing-off"
  | "paused"
  | "relink-required";

export interface SessionSnapshot {
  state: SessionState;
  outboundPaused: boolean;
  reconnectAttempt: number;
  retryAt?: Date;
  lastFailure?: SessionFailure;
}

export class ChannelSessionGuard {
  #snapshot: SessionSnapshot = { state: "stopped", outboundPaused: false, reconnectAttempt: 0 };

  constructor(
    private readonly channel: string,
    private readonly alerts: AlertSink,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  snapshot(): SessionSnapshot {
    return { ...this.#snapshot };
  }

  connecting(): void {
    this.#snapshot = {
      state: "connecting",
      outboundPaused: this.#snapshot.outboundPaused,
      reconnectAttempt: this.#snapshot.reconnectAttempt,
    };
  }

  linked(): void {
    this.#snapshot = { state: "linked", outboundPaused: false, reconnectAttempt: 0 };
  }

  stop(): void {
    this.#snapshot = { state: "stopped", outboundPaused: true, reconnectAttempt: 0 };
  }

  async fail(reason: SessionFailure, retryAfterMs?: number): Promise<SessionSnapshot> {
    if (reason === "logout" || reason === "ban") {
      this.#snapshot = {
        state: "relink-required",
        outboundPaused: true,
        reconnectAttempt: 0,
        lastFailure: reason,
      };
      await this.alerts.alert(`${this.channel} session requires relinking`, {
        channel: this.channel,
        reason,
        command: "kaki wa relink",
      });
      return this.snapshot();
    }
    if (reason === "rate-limit") {
      const retryAt = new Date(this.clock().getTime() + (retryAfterMs ?? 60_000));
      this.#snapshot = {
        state: "paused",
        outboundPaused: true,
        reconnectAttempt: this.#snapshot.reconnectAttempt,
        retryAt,
        lastFailure: reason,
      };
      await this.alerts.alert(`${this.channel} outbound paused after rate limit`, {
        channel: this.channel,
        retryAt: retryAt.toISOString(),
      });
      return this.snapshot();
    }
    const reconnectAttempt = this.#snapshot.reconnectAttempt + 1;
    const delay = Math.min(60_000, 1_000 * 2 ** Math.min(reconnectAttempt - 1, 6));
    const retryAt = new Date(this.clock().getTime() + delay);
    this.#snapshot = {
      state: "backing-off",
      outboundPaused: true,
      reconnectAttempt,
      retryAt,
      lastFailure: reason,
    };
    return this.snapshot();
  }
}
