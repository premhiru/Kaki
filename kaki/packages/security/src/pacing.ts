export interface PacingConfig {
  minTypingMs: number;
  maxTypingMs: number;
  externalIntervalMs: number;
  newContactDailyCap: number;
  quietStartHour: number;
  quietEndHour: number;
  timeZone?: string;
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
  | { allowed: true; delayMs: number }
  | { allowed: false; reason: string; retryAt?: Date };

export const DEFAULT_PACING: PacingConfig = {
  minTypingMs: 1500,
  maxTypingMs: 6000,
  externalIntervalMs: 10_000,
  newContactDailyCap: 25,
  quietStartHour: 23,
  quietEndHour: 7,
  timeZone: "Asia/Singapore",
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
  const { hour, minute, second } = localClock(
    context.now,
    config.timeZone ?? DEFAULT_PACING.timeZone ?? "Asia/Singapore",
  );
  const quiet = hour >= config.quietStartHour || hour < config.quietEndHour;
  if (quiet && !context.urgent) {
    const currentSeconds = hour * 3600 + minute * 60 + second;
    const quietEndSeconds = config.quietEndHour * 3600;
    const secondsUntilEnd =
      (quietEndSeconds - currentSeconds + 24 * 3600) % (24 * 3600) || 24 * 3600;
    const retryAt = new Date(context.now.getTime() + secondsUntilEnd * 1000);
    retryAt.setMilliseconds(0);
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

function localClock(
  date: Date,
  timeZone: string,
): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: "hour" | "minute" | "second") =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { hour: value("hour"), minute: value("minute"), second: value("second") };
}
