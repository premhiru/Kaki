import { createHash } from "node:crypto";
import type { HouseholdKeyBroker } from "../src/index.js";

export class DeterministicTestKeyBroker implements HouseholdKeyBroker {
  public async getHouseholdKey(householdId: string): Promise<Uint8Array> {
    return createHash("sha256").update(`test-only:${householdId}`).digest();
  }
}
