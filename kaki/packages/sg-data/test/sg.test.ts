import { describe, expect, it } from "vitest";
import { decodeSgqr, encodePayNow, evaluateMonitor, parseSingaporeAddress } from "../src/index.js";

describe("Singapore primitives", () => {
  it("parses local addresses", () => {
    expect(parseSingaporeAddress("Blk 123A AMK Ave 3 #05-67 S560123")).toMatchObject({
      block: "123A",
      street: "AMK Ave 3",
      floor: "05",
      unitNumber: "67",
      unit: "#05-67",
      postalCode: "560123",
      country: "SG",
    });
    expect(parseSingaporeAddress("10 Anson Road, Singapore 079903")).toMatchObject({
      street: "10 Anson Road",
      postalCode: "079903",
    });
  });
  it("round-trips PayNow SGQR", () => {
    const raw = encodePayNow({
      proxyType: "2",
      proxyValue: "201912345Z",
      merchantName: "KAKI AIRCON",
      amount: 120,
      reference: "INV123",
    });
    expect(decodeSgqr(raw)).toMatchObject({
      merchantName: "KAKI AIRCON",
      amount: 120,
      amountMinor: 12000,
      currency: "SGD",
      reference: "INV123",
      crcValid: true,
      warnings: [],
      paynow: { proxyValue: "201912345Z" },
    });
    const tampered = `${raw.slice(0, -1)}${raw.endsWith("0") ? "1" : "0"}`;
    expect(decodeSgqr(tampered)).toMatchObject({ crcValid: false, warnings: ["crc-invalid"] });
  });

  it("uses EMV byte lengths for Unicode merchant names", () => {
    const raw = encodePayNow({
      proxyType: "0",
      proxyValue: "+6591234567",
      merchantName: "Kaki 家",
    });
    expect(decodeSgqr(raw)).toMatchObject({ merchantName: "Kaki 家", crcValid: true });
  });
  it("fires threshold monitors", () => {
    expect(evaluateMonitor("haze", { psi: 101 }).shouldNotify).toBe(true);
    expect(evaluateMonitor("rain-before-commute", { probability: 20 }).shouldNotify).toBe(false);
    expect(
      evaluateMonitor("dengue-near-home", { clusterId: "c1", distanceMetres: 500, cases: 12 })
        .shouldNotify,
    ).toBe(true);
    expect(
      evaluateMonitor("erp-change", { oldRate: 1, newRate: 2, route: "CTE" }).shouldNotify,
    ).toBe(true);
  });
});
