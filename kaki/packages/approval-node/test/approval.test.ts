import { describe, expect, it } from "vitest";
import {
  ApprovalEngine,
  MemoryApprovalLedger,
  buildHandoff,
  buildPaymentHandoff,
  detectHandoff,
  hashMaterialFacts,
  renderTelegram,
  renderUi,
  renderWhatsApp,
} from "../src/index.js";

describe("approval cards", () => {
  it("renders and records numbered-reply approval", async () => {
    const engine = new ApprovalEngine(new MemoryApprovalLedger());
    const card = await engine.create({
      taskId: "t1",
      householdId: "h1",
      requestedByPersonId: "wei",
      title: "Pay Ah Seng",
      summary: "Aircon service",
      category: "money.purchase",
      amount: { currency: "SGD", minorUnits: 12000 },
      choices: [
        { id: "1", label: "Approve", action: "approve" },
        { id: "2", label: "Deny", action: "deny" },
      ],
    });
    expect(renderWhatsApp(card)).toContain("1. Approve");
    const response = await engine.respond(card.id, {
      choiceId: "1",
      personId: "wei",
      factsHash: card.factsHash,
    });
    expect(response.status).toBe("approved");
    expect(response.amount).toEqual({ currency: "SGD", minorUnits: 12000 });
    expect(response.grant?.singleUse).toBe(true);
  });
  it("detects human handoffs", () => {
    expect(detectHandoff("Scan this QR with your Singpass app")).toBe("singpass");
    expect(detectHandoff("Approve in your bank app with digital token")).toBe("bank-2fa");
    expect(detectHandoff("Enter your one-time password")).toBe("otp");
    expect(buildHandoff("singpass")).toMatchObject({
      category: "gov.singpass",
      neverRequestSecret: true,
    });
  });

  it("binds and consumes a grant once", async () => {
    const ledger = new MemoryApprovalLedger();
    let sequence = 0;
    const engine = new ApprovalEngine(ledger, { id: () => `id-${++sequence}` });
    const card = await engine.create({
      taskId: "task",
      traceId: "trace",
      stepId: "pay",
      householdId: "home",
      requestedByPersonId: "wei",
      title: "Pay vendor",
      summary: "Aircon",
      category: "money.purchase",
      materialFacts: { payee: "vendor-1", purpose: "aircon" },
      amount: { currency: "SGD", minorUnits: 12000 },
    });
    const approved = await engine.respond(card.id, {
      choiceId: "approve",
      personId: "wei",
      factsHash: card.factsHash,
    });
    const grant = approved.grant!;
    await expect(
      engine.consumeGrant(grant.id, {
        householdId: "home",
        taskId: "task",
        stepId: "pay",
        materialFacts: card.materialFacts,
      }),
    ).resolves.toEqual(grant);
    await expect(
      engine.consumeGrant(grant.id, {
        householdId: "home",
        taskId: "task",
        stepId: "pay",
        materialFacts: card.materialFacts,
      }),
    ).rejects.toThrow("replayed");
  });

  it("records and consumes a policy-authorized grant below the household cap", async () => {
    const ledger = new MemoryApprovalLedger();
    let sequence = 0;
    const engine = new ApprovalEngine(ledger, { id: () => `auto-${++sequence}` });
    const authorization = await engine.authorize({
      taskId: "buy",
      stepId: "purchase",
      householdId: "home",
      requestedByPersonId: "wei",
      title: "Buy groceries",
      summary: "Known grocer",
      category: "money.purchase",
      knownPayee: true,
      amount: { currency: "SGD", minorUnits: 1200 },
      materialFacts: { payee: "grocer-1" },
    });

    expect(authorization.status).toBe("authorized");
    if (authorization.status !== "authorized") throw new Error("expected automatic grant");
    expect(authorization.card).toMatchObject({
      status: "approved",
      policy: { action: "auto", reasonCode: "money_known_under_cap" },
    });
    expect(await ledger.pending("home")).toHaveLength(0);
    await expect(
      engine.consumeGrant(authorization.grant.id, {
        householdId: "home",
        taskId: "buy",
        stepId: "purchase",
        materialFacts: authorization.card.materialFacts,
      }),
    ).resolves.toEqual(authorization.grant);
    expect((await ledger.audit(authorization.card.id)).map((event) => event.action)).toEqual([
      "created",
      "approved",
      "grant_consumed",
    ]);
  });

  it("authorizes the household actor and resolves provider-native replies at the engine", async () => {
    const ledger = new MemoryApprovalLedger();
    const engine = new ApprovalEngine(ledger, {
      id: () => "card-1",
      authorizeDecision: ({ card, personId }) =>
        card.householdId === "home" && personId === "household-owner",
    });
    const card = await engine.create({
      taskId: "task",
      householdId: "home",
      requestedByPersonId: "household-owner",
      title: "Book ride",
      summary: "S$18.20 to Raffles Place",
      category: "booking",
    });
    await expect(
      engine.respondFromTelegramCallback(
        renderTelegram(card).inlineKeyboard[0]?.[0]?.callbackData ?? "",
        "stranger",
      ),
    ).rejects.toThrow("actor-unauthorized");
    await expect(
      engine.respondFromWhatsAppReply(card.id, "1", "household-owner"),
    ).resolves.toMatchObject({ status: "approved", decidedByPersonId: "household-owner" });
    expect((await ledger.audit(card.id)).map((event) => event.action)).toContain(
      "unauthorized_rejected",
    );
  });

  it("rejects mutation and decision replay and audits both", async () => {
    const ledger = new MemoryApprovalLedger();
    const engine = new ApprovalEngine(ledger);
    const card = await engine.create({
      taskId: "task",
      stepId: "pay",
      householdId: "home",
      requestedByPersonId: "wei",
      title: "Pay",
      summary: "Vendor",
      category: "money.transfer",
      amount: { currency: "SGD", minorUnits: 5000 },
      materialFacts: { payee: "vendor" },
    });
    await expect(
      engine.respond(card.id, {
        choiceId: "approve",
        personId: "wei",
        factsHash: hashMaterialFacts({ payee: "attacker" }),
      }),
    ).rejects.toThrow("material-facts-changed");
    await engine.respond(card.id, { choiceId: "deny", personId: "wei", factsHash: card.factsHash });
    await expect(
      engine.respond(card.id, { choiceId: "approve", personId: "wei", factsHash: card.factsHash }),
    ).rejects.toThrow("replay");
    expect((await ledger.audit(card.id)).map((event) => event.action)).toEqual(
      expect.arrayContaining(["created", "mutation_rejected", "denied", "replay_rejected"]),
    );
  });

  it("repings once, expires, and renders Telegram/UI models", async () => {
    const ledger = new MemoryApprovalLedger();
    const engine = new ApprovalEngine(ledger, { defaultExpiryMs: 1000 });
    const start = new Date("2026-08-24T00:00:00Z");
    const card = await engine.create(
      {
        taskId: "task",
        householdId: "home",
        requestedByPersonId: "wei",
        title: "Book",
        summary: "Clinic",
        category: "booking",
      },
      start,
    );
    const repinged = await engine.reping(card.id, new Date(start.getTime() + 500));
    expect(renderTelegram(repinged).inlineKeyboard[0]).toHaveLength(2);
    expect(renderUi(repinged)).toMatchObject({ status: "pending", factsHash: card.factsHash });
    await expect(engine.reping(card.id, new Date(start.getTime() + 600))).rejects.toThrow(
      "not-allowed",
    );
    expect(await engine.expireDue(new Date(start.getTime() + 1001))).toBe(1);
  });

  it("keeps every Southeast Asian QR rail behind approval and bank confirmation", () => {
    for (const rail of ["paynow", "duitnow", "promptpay", "qris", "vietqr", "qrph"] as const) {
      expect(buildPaymentHandoff(rail)).toMatchObject({
        rail,
        requiresApproval: true,
        requiresBankConfirmation: true,
        receiptRequired: true,
      });
    }
  });
});
