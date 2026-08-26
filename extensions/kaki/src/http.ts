import type { IncomingMessage, ServerResponse } from "node:http";
import { formatErrorMessage } from "openclaw/plugin-sdk/error-runtime";
import {
  applyBasicWebhookRequestGuards,
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
} from "openclaw/plugin-sdk/webhook-request-guards";
import { isApprovalDecisionConflict, parseControlAction, performControlAction } from "./actions.js";
import type { KakiRuntimeOwners } from "./contracts.js";
import { projectActionResult } from "./projection.js";
import { readKakiSnapshot, withOwnerDeadline } from "./runtime.js";

const MAX_ACTION_BYTES = 100_000;
const MAX_RESPONSE_BYTES = 1_000_000;

type ResolveOwners = () => KakiRuntimeOwners | undefined;

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  if (Buffer.byteLength(body) > MAX_RESPONSE_BYTES) {
    res.statusCode = 502;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(
      JSON.stringify({
        ok: false,
        error: "Kaki owner response exceeded the limit.",
      }),
    );
    return;
  }
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(body);
}

function unavailable(res: ServerResponse): void {
  sendJson(res, 503, {
    ok: false,
    error: "Kaki runtime owners are unavailable. Finish `kaki onboard`, then restart the Gateway.",
  });
}

export function createKakiHttpHandlers(options: {
  resolveOwners: ResolveOwners;
  operatorPersonId: string | undefined;
  warn?: (message: string) => void;
}) {
  const inFlight = createWebhookInFlightLimiter({
    maxInFlightPerKey: 8,
    maxTrackedKeys: 1,
  });

  const snapshot = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    if (!applyBasicWebhookRequestGuards({ req, res, allowMethods: ["GET"] })) return true;
    if (!inFlight.tryAcquire("kaki-control")) {
      sendJson(res, 429, {
        ok: false,
        error: "Too many Kaki control requests. Retry shortly.",
      });
      return true;
    }
    try {
      const owners = options.resolveOwners();
      if (!owners) {
        unavailable(res);
        return true;
      }
      sendJson(res, 200, await withOwnerDeadline((signal) => readKakiSnapshot(owners, signal)));
    } catch (error) {
      options.warn?.(`kaki: snapshot owner failed: ${formatErrorMessage(error).slice(0, 500)}`);
      unavailable(res);
    } finally {
      inFlight.release("kaki-control");
    }
    return true;
  };

  const action = async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    if (
      !applyBasicWebhookRequestGuards({
        req,
        res,
        allowMethods: ["POST"],
        requireJsonContentType: true,
      })
    ) {
      return true;
    }
    if (req.headers["x-kaki-intent"] !== "operator-action") {
      sendJson(res, 400, {
        ok: false,
        error: "Missing Kaki operator action intent.",
      });
      return true;
    }
    if (!inFlight.tryAcquire("kaki-control")) {
      sendJson(res, 429, {
        ok: false,
        error: "Too many Kaki control requests. Retry shortly.",
      });
      return true;
    }
    try {
      const body = await readJsonWebhookBodyOrReject({
        req,
        res,
        maxBytes: MAX_ACTION_BYTES,
        timeoutMs: 5_000,
        invalidJsonMessage: "Kaki action must be valid JSON.",
      });
      if (!body.ok) return true;
      const parsed = parseControlAction(body.value);
      if (!parsed) {
        sendJson(res, 400, {
          ok: false,
          error: "Kaki action does not match a supported schema.",
        });
        return true;
      }
      const owners = options.resolveOwners();
      if (!owners || !options.operatorPersonId) {
        unavailable(res);
        return true;
      }
      const outcome = await withOwnerDeadline(async (signal) => {
        const result = projectActionResult(
          await performControlAction(owners, parsed, signal, options.operatorPersonId!),
        );
        const next = await readKakiSnapshot(owners, signal);
        return { ...result, snapshot: next };
      });
      sendJson(res, 200, outcome);
    } catch (error) {
      if (isApprovalDecisionConflict(error)) {
        sendJson(res, 409, {
          ok: false,
          error: "Approval changed. Refresh the Kaki snapshot before deciding.",
        });
        return true;
      }
      options.warn?.("kaki: action owner failed");
      unavailable(res);
    } finally {
      inFlight.release("kaki-control");
    }
    return true;
  };

  return { snapshot, action };
}
