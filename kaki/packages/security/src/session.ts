export type GuardEvent = "healthy" | "logout" | "ban" | "rate-limit" | "network-error";
export interface GuardState {
  state: "active" | "paused" | "relink-required" | "backoff";
  outboundAllowed: boolean;
  retryAt?: Date;
  reason?: GuardEvent;
  attempts: number;
}
export class OutboundSessionGuard {
  #state: GuardState = { state: "active", outboundAllowed: true, attempts: 0 };
  constructor(private readonly clock: () => Date = () => new Date()) {}
  state(): GuardState {
    return { ...this.#state };
  }
  transition(event: GuardEvent, retryAfterMs?: number): GuardState {
    if (event === "healthy") this.#state = { state: "active", outboundAllowed: true, attempts: 0 };
    else if (event === "logout" || event === "ban")
      this.#state = {
        state: "relink-required",
        outboundAllowed: false,
        reason: event,
        attempts: this.#state.attempts,
      };
    else if (event === "rate-limit")
      this.#state = {
        state: "paused",
        outboundAllowed: false,
        retryAt: new Date(this.clock().getTime() + (retryAfterMs ?? 60_000)),
        reason: event,
        attempts: this.#state.attempts,
      };
    else {
      const attempts = this.#state.attempts + 1;
      this.#state = {
        state: "backoff",
        outboundAllowed: false,
        retryAt: new Date(this.clock().getTime() + Math.min(60_000, 1_000 * 2 ** (attempts - 1))),
        reason: event,
        attempts,
      };
    }
    return this.state();
  }
  assertOutbound(): void {
    if (!this.#state.outboundAllowed)
      throw new Error(`session-outbound-paused:${this.#state.reason ?? "unknown"}`);
  }
}
