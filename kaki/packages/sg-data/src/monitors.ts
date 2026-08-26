export type MonitorKind =
  | "rain-before-commute"
  | "train-disruption"
  | "haze"
  | "hawker-closure"
  | "cpf-deadline"
  | "srs-deadline"
  | "iras-window"
  | "dengue-near-home"
  | "erp-change"
  | "vehicle-expiry"
  | "road-tax-expiry"
  | "season-parking-expiry"
  | "insurance-expiry"
  | "coe-result"
  | "housing-match"
  | "bto-match"
  | "resale-match";
export interface MonitorSignal {
  kind: MonitorKind;
  shouldNotify: boolean;
  message?: string;
  dedupeKey: string;
  urgency?: "normal" | "urgent";
  observedAt?: string;
}

export function evaluateMonitor(kind: MonitorKind, data: Record<string, unknown>): MonitorSignal {
  switch (kind) {
    case "rain-before-commute": {
      const probability = Number(data.probability ?? 0);
      const minutes = Number(data.minutesUntilCommute ?? 60);
      const notify = probability >= 60 && minutes >= 0 && minutes <= 120;
      return {
        kind,
        shouldNotify: notify,
        ...(notify
          ? { message: `Rain likely (${probability}%) before your commute. Bring umbrella.` }
          : {}),
        dedupeKey: `${kind}:${scalar(data.commuteId, "default")}:${scalar(data.date, "today")}`,
      };
    }
    case "train-disruption": {
      const affected = Boolean(data.affected);
      return {
        kind,
        shouldNotify: affected,
        ...(affected
          ? {
              message: `${scalar(data.line, "Your MRT line")} disruption: ${scalar(data.detail, "allow extra time")}`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.incidentId ?? data.line, "active")}`,
      };
    }
    case "haze": {
      const psi = Number(data.psi ?? 0);
      return {
        kind,
        shouldNotify: psi >= 100,
        ...(psi >= 100 ? { message: `PSI is ${psi}. Reduce prolonged outdoor activity.` } : {}),
        dedupeKey: `${kind}:${scalar(data.period, "current")}`,
      };
    }
    case "hawker-closure": {
      const closed = Boolean(data.closed);
      return {
        kind,
        shouldNotify: closed,
        ...(closed
          ? {
              message: `${scalar(data.name, "Favourite hawker centre")} is closed ${scalar(data.when, "today")}.`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.name)}:${scalar(data.when)}`,
      };
    }
    case "cpf-deadline":
    case "srs-deadline": {
      const days = Number(data.daysRemaining ?? 999);
      return {
        kind,
        shouldNotify: days >= 0 && days <= 14,
        ...(days >= 0 && days <= 14
          ? {
              message: `${kind === "cpf-deadline" ? "CPF" : "SRS"} year-end deadline in ${days} days.`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.year, String(new Date().getFullYear()))}`,
      };
    }
    case "iras-window": {
      const open = Boolean(data.open);
      const days = Number(data.daysRemaining ?? Infinity);
      const notify = open && days >= 0 && days <= Number(data.noticeDays ?? 30);
      return {
        kind,
        shouldNotify: notify,
        ...(notify ? { message: `IRAS filing window closes in ${days} days.` } : {}),
        dedupeKey: `${kind}:${scalar(data.year)}:${scalar(data.closeDate)}`,
      };
    }
    case "dengue-near-home": {
      const distance = Number(data.distanceMetres ?? Infinity);
      const cases = Number(data.cases ?? 0);
      const notify = distance <= Number(data.radiusMetres ?? 1000) && cases > 0;
      return {
        kind,
        shouldNotify: notify,
        ...(notify
          ? {
              message: `Dengue cluster with ${cases} reported cases is ${Math.round(distance)}m from home.`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.clusterId, "nearby")}:${cases}`,
      };
    }
    case "erp-change": {
      const changed =
        Number(data.oldRate) !== Number(data.newRate) && Number.isFinite(Number(data.newRate));
      return {
        kind,
        shouldNotify: changed,
        ...(changed
          ? {
              message: `ERP on ${scalar(data.route, "your route")} changes to S$${Number(data.newRate).toFixed(2)} ${scalar(data.effective, "soon")}.`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.gantryId ?? data.route)}:${scalar(data.effective)}`,
      };
    }
    case "vehicle-expiry":
    case "road-tax-expiry":
    case "season-parking-expiry":
    case "insurance-expiry": {
      const days = Number(data.daysRemaining ?? Infinity);
      const notify = days >= 0 && days <= Number(data.noticeDays ?? 30);
      return {
        kind,
        shouldNotify: notify,
        ...(notify
          ? {
              message: `${scalar(
                data.item,
                kind === "road-tax-expiry"
                  ? "Road tax"
                  : kind === "season-parking-expiry"
                    ? "Season parking"
                    : kind === "insurance-expiry"
                      ? "Vehicle insurance"
                      : "Vehicle renewal",
              )} is due in ${days} days.`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.vehicleId, "vehicle")}:${scalar(data.item)}:${scalar(data.expiryDate)}`,
      };
    }
    case "coe-result": {
      const watched = Boolean(data.watched);
      return {
        kind,
        shouldNotify: watched,
        ...(watched
          ? {
              message: `COE ${scalar(data.category, "result")}: S$${Number(data.premium ?? 0).toLocaleString("en-SG")}.`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.exerciseId ?? data.date)}:${scalar(data.category)}`,
      };
    }
    case "housing-match":
    case "bto-match":
    case "resale-match": {
      const count = Number(data.newMatches ?? 0);
      return {
        kind,
        shouldNotify: count > 0,
        ...(count > 0
          ? {
              message: `${count} new ${scalar(data.kind, "housing")} match${count === 1 ? "" : "es"} fit your saved criteria.`,
            }
          : {}),
        dedupeKey: `${kind}:${scalar(data.searchId, "default")}:${scalar(data.snapshotId ?? data.date)}`,
      };
    }
  }
}

function scalar(value: unknown, fallback = "unknown"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return fallback;
}
