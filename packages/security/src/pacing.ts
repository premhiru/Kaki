export interface PacingConfig {
  minTypingMs: number;
  maxTypingMs: number;
  externalIntervalMs: number;
  newContactDailyCap: number;
  quietStartHour: number;
  quietEndHour: number;
}

export interface SendContext {
  household: boolean;
  urgent: boolean;
  newContact: boolean;
  sentToExternalToday: number;
  lastExternalSentAt?: Date;
  now: Date;
}

export type PacingDecision =
  { allowed: true; delayMs: number } | { allowed: false; reason: string; retryAt?: Date };

export const DEFAULT_PACING: PacingConfig = {
  minTypingMs: 1500,
  maxTypingMs: 6000,
  externalIntervalMs: 10_000,
  newContactDailyCap: 25,
  quietStartHour: 23,
  quietEndHour: 7,
};

export function pace(
  context: SendContext,
  config = DEFAULT_PACING,
  random = Math.random,
): PacingDecision {
  const delayMs = Math.round(
    config.minTypingMs + random() * (config.maxTypingMs - config.minTypingMs),
  );
  if (context.household) return { allowed: true, delayMs };
  const hour = context.now.getHours();
  const quiet = hour >= config.quietStartHour || hour < config.quietEndHour;
  if (quiet && !context.urgent) {
    const retryAt = new Date(context.now);
    retryAt.setHours(config.quietEndHour, 0, 0, 0);
    if (retryAt <= context.now) retryAt.setDate(retryAt.getDate() + 1);
    return { allowed: false, reason: "quiet-hours", retryAt };
  }
  if (context.newContact && context.sentToExternalToday >= config.newContactDailyCap)
    return { allowed: false, reason: "new-contact-daily-cap" };
  if (context.lastExternalSentAt) {
    const elapsed = context.now.getTime() - context.lastExternalSentAt.getTime();
    if (elapsed < config.externalIntervalMs)
      return {
        allowed: false,
        reason: "external-rate-limit",
        retryAt: new Date(context.lastExternalSentAt.getTime() + config.externalIntervalMs),
      };
  }
  return { allowed: true, delayMs };
}
