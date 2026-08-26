import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defineSkill,
  executeSkill,
  getSkillDefinition,
  type SkillActionDispatcher,
  type SkillApprovalAuthority,
  type SkillApprovalPreparation,
  type SkillApprovalRequest,
  type SkillFixture,
} from "../src/runner.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("fixture runner", () => {
  it("derives results from the catalogue instead of echoing fixture expectations", async () => {
    const fixturePath = join(import.meta.dirname, "..", "sg", "iras-noa", "fixtures", "happy.json");
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as SkillFixture;
    const directory = await mkdtemp(join(tmpdir(), "kaki-skill-fixture-"));
    temporaryDirectories.push(directory);
    const poisonedPath = join(directory, "poisoned.json");
    await writeFile(
      poisonedPath,
      JSON.stringify({
        ...fixture,
        expect: {
          status: "completed",
          approval: "none",
          actionIds: ["invented.action"],
          evidence: ["invented-success"],
        },
      }),
    );

    const run = defineSkill(
      pathToFileURL(join(import.meta.dirname, "..", "sg", "iras-noa", "run.ts")).href,
      "sg.iras-noa",
    );
    const result = await run({ fixturePath: poisonedPath });

    expect(result.status).toBe("needs_approval");
    expect(result.approval).toBe("gov.singpass");
    expect(result.actionIds).toEqual(["iras-noa.source", "iras-noa.prepare"]);
    expect(result.evidence).not.toContain("invented-success");
    expect(result.sideEffects).toBe(0);
  });

  it("rejects fixtures missing a skill-specific required input", async () => {
    const fixturePath = join(import.meta.dirname, "..", "sg", "iras-noa", "fixtures", "happy.json");
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as SkillFixture;
    const directory = await mkdtemp(join(tmpdir(), "kaki-skill-fixture-"));
    temporaryDirectories.push(directory);
    const incompletePath = join(directory, "incomplete.json");
    const { assessment_year: _missing, ...input } = fixture.input;
    await writeFile(incompletePath, JSON.stringify({ ...fixture, input }));
    const run = defineSkill(
      pathToFileURL(join(import.meta.dirname, "..", "sg", "iras-noa", "run.ts")).href,
      "sg.iras-noa",
    );

    await expect(run({ fixturePath: incompletePath })).rejects.toThrow(
      "sg.iras-noa requires input: assessment_year",
    );
  });

  it("rejects fixtures for another skill and fixtures outside explicit fixture mode", async () => {
    const fixturePath = join(import.meta.dirname, "..", "sg", "iras-noa", "fixtures", "happy.json");
    const fixture = JSON.parse(await readFile(fixturePath, "utf8")) as SkillFixture;
    const directory = await mkdtemp(join(tmpdir(), "kaki-skill-fixture-"));
    temporaryDirectories.push(directory);
    const wrongSkillPath = join(directory, "wrong-skill.json");
    const liveModePath = join(directory, "live-mode.json");
    await writeFile(wrongSkillPath, JSON.stringify({ ...fixture, skillId: "sg.cpf-overview" }));
    await writeFile(liveModePath, JSON.stringify({ ...fixture, context: { fixture: false } }));
    const run = defineSkill(
      pathToFileURL(join(import.meta.dirname, "..", "sg", "iras-noa", "run.ts")).href,
      "sg.iras-noa",
    );

    await expect(run({ fixturePath: wrongSkillPath })).rejects.toThrow(
      "belongs to sg.cpf-overview, expected sg.iras-noa",
    );
    await expect(run({ fixturePath: liveModePath })).rejects.toThrow(
      "Fixture runner requires fixture mode",
    );
  });
});

describe("production executor", () => {
  const input = {
    request: "check the 2025 IRAS NOA",
    assessment_year: "2025",
  };
  const baseContext = {
    householdId: "household-1",
    personId: "person-1",
    locale: "sg",
  } as const;

  it("dispatches preparation through declared surfaces and fences the final action", async () => {
    const dispatch = vi.fn(async (action: { id: string }) => ({ evidence: `proof:${action.id}` }));
    const dispatcher: SkillActionDispatcher = { dispatch };

    const result = await executeSkill("sg.iras-noa", input, baseContext, dispatcher);

    expect(result.status).toBe("needs_approval");
    expect(result.completedActions).toEqual(["iras-noa.source", "iras-noa.prepare"]);
    expect(dispatch.mock.calls.map(([action]) => action.id)).toEqual([
      "iras-noa.source",
      "iras-noa.prepare",
    ]);
  });

  it("creates an authoritative approval before a separate grant resumes the exact commit", async () => {
    const dispatch = vi.fn(async (action: { id: string }) => ({ evidence: `proof:${action.id}` }));
    const dispatcher: SkillActionDispatcher = { dispatch };
    const definition = getSkillDefinition("sg.iras-noa");
    const authority = new SingleUseAuthority(
      (request) =>
        request.skillId === definition.id &&
        request.category === definition.approval &&
        request.householdId === baseContext.householdId &&
        request.personId === baseContext.personId &&
        request.approvalActionId === "iras-noa.approve" &&
        request.commitActionId === "iras-noa.commit" &&
        request.materialFingerprint.length === 64,
    );

    const prepared = await executeSkill(definition.id, input, baseContext, dispatcher, authority);
    expect(prepared).toMatchObject({
      status: "needs_approval",
      approvalRequest: { approvalCardId: "card-1" },
    });
    expect(dispatch.mock.calls.map(([action]) => action.id)).not.toContain("iras-noa.commit");

    const result = await executeSkill(
      definition.id,
      input,
      baseContext,
      dispatcher,
      authority,
      "grant-1",
    );

    expect(result.status).toBe("completed");
    expect(result.completedActions).toEqual(definition.actions.map((action) => action.id));
    expect(dispatch.mock.calls.map(([action]) => action.id)).toEqual([
      "iras-noa.source",
      "iras-noa.prepare",
      "iras-noa.source",
      "iras-noa.prepare",
      "iras-noa.commit",
    ]);
    expect(authority.preparations).toHaveLength(1);
    expect(authority.requests).toHaveLength(1);
  });

  it("rejects replay of an already consumed approval", async () => {
    const dispatch = vi.fn(async (action: { id: string }) => ({ evidence: `proof:${action.id}` }));
    const authority = new SingleUseAuthority(() => true);
    await executeSkill("sg.iras-noa", input, baseContext, { dispatch }, authority);
    const first = await executeSkill(
      "sg.iras-noa",
      input,
      baseContext,
      { dispatch },
      authority,
      "grant-1",
    );
    const second = await executeSkill(
      "sg.iras-noa",
      input,
      baseContext,
      { dispatch },
      authority,
      "grant-1",
    );

    expect(first.status).toBe("completed");
    expect(second.status).toBe("needs_approval");
    expect(second.summary).toContain("already consumed");
    expect(dispatch.mock.calls.filter(([action]) => action.id === "iras-noa.commit")).toHaveLength(
      1,
    );
  });

  it("consumes an owner-issued automatic grant before dispatching the commit", async () => {
    const dispatch = vi.fn(async (action: { id: string }) => ({ evidence: `proof:${action.id}` }));
    const authority = new AutoAuthority();

    const result = await executeSkill("sg.iras-noa", input, baseContext, { dispatch }, authority);

    expect(result.status).toBe("completed");
    expect(authority.consumedGrantIds).toEqual(["auto-grant-1"]);
    expect(dispatch.mock.calls.map(([action]) => action.id)).toContain("iras-noa.commit");
  });

  it("rejects wrong-household and mutated material facts against the authoritative binding", async () => {
    const capture = new SingleUseAuthority(() => true);
    const dispatcher: SkillActionDispatcher = {
      dispatch: async (action) => ({ evidence: `proof:${action.id}` }),
    };
    await executeSkill("sg.iras-noa", input, baseContext, dispatcher, capture);
    const binding = capture.preparations[0];
    expect(binding).toBeDefined();
    if (!binding) throw new Error("missing captured approval binding");

    const wrongHousehold = new SingleUseAuthority((request) => sameBinding(request, binding));
    const wrongHouseholdResult = await executeSkill(
      "sg.iras-noa",
      input,
      { ...baseContext, householdId: "household-2" },
      dispatcher,
      wrongHousehold,
      "grant-1",
    );
    const mutatedFacts = new SingleUseAuthority((request) => sameBinding(request, binding));
    const mutatedFactsResult = await executeSkill(
      "sg.iras-noa",
      { ...input, assessment_year: "2024" },
      baseContext,
      dispatcher,
      mutatedFacts,
      "grant-1",
    );

    expect(wrongHouseholdResult.status).toBe("needs_approval");
    expect(mutatedFactsResult.status).toBe("needs_approval");
    expect(wrongHouseholdResult.completedActions).not.toContain("iras-noa.commit");
    expect(mutatedFactsResult.completedActions).not.toContain("iras-noa.commit");
  });

  it("rejects material facts mutated while preparation is awaiting", async () => {
    const mutableInput = { ...input };
    const authority = new SingleUseAuthority(() => true);
    const dispatcher: SkillActionDispatcher = {
      dispatch: async (action) => {
        if (action.id === "iras-noa.prepare") mutableInput.assessment_year = "2024";
        return { evidence: `proof:${action.id}` };
      },
    };

    const result = await executeSkill(
      "sg.iras-noa",
      mutableInput,
      baseContext,
      dispatcher,
      authority,
    );

    expect(result.status).toBe("needs_approval");
    expect(result.summary).toContain("material facts changed");
    expect(authority.requests).toHaveLength(0);
  });

  it("rejects accessor-backed material facts without invoking the accessor", async () => {
    let reads = 0;
    const hostileInput = Object.defineProperty({ request: "check the NOA" }, "assessment_year", {
      enumerable: true,
      get() {
        reads += 1;
        return "2025";
      },
    });
    const dispatcher: SkillActionDispatcher = {
      dispatch: async (action) => ({ evidence: `proof:${action.id}` }),
    };

    await expect(
      executeSkill("sg.iras-noa", hostileInput, baseContext, dispatcher),
    ).rejects.toThrow("Skill input accessors are not allowed");
    expect(reads).toBe(0);
  });

  it("rejects unknown skills, missing required values, and effect claims without evidence", async () => {
    const dispatcher: SkillActionDispatcher = {
      dispatch: async (action) => ({ evidence: `proof:${action.id}` }),
    };
    await expect(executeSkill("unknown.skill", input, baseContext, dispatcher)).rejects.toThrow(
      "Unknown Kaki skill: unknown.skill",
    );
    for (const missing of [null, ""] as const) {
      await expect(
        executeSkill(
          "sg.iras-noa",
          { ...input, assessment_year: missing },
          baseContext,
          dispatcher,
        ),
      ).rejects.toThrow("sg.iras-noa requires input: assessment_year");
    }
    await expect(
      executeSkill("sg.iras-noa", input, baseContext, {
        dispatch: async () => ({ evidence: "   " }),
      }),
    ).rejects.toThrow("returned empty evidence");
  });

  it("rejects hostile non-JSON material facts before any surface dispatch", async () => {
    const dispatch = vi.fn(async (action: { id: string }) => ({ evidence: `proof:${action.id}` }));
    const invalidInputs: Array<Readonly<Record<string, unknown>>> = [
      { ...input, extra: Number.NaN },
      { ...input, extra: undefined },
      { ...input, extra: new Date() },
      { ...input, extra: Symbol("not-json") },
      Object.defineProperty({ ...input }, "hidden", { enumerable: false, value: "secret" }),
      { ...input, extra: Object.assign(["one"], { named: "two" }) },
      { ...input, extra: new Array(1) },
    ];
    const symbolInput = { ...input };
    Object.defineProperty(symbolInput, Symbol("hidden"), { enumerable: true, value: "secret" });
    invalidInputs.push(symbolInput);

    for (const invalid of invalidInputs) {
      await expect(executeSkill("sg.iras-noa", invalid, baseContext, { dispatch })).rejects.toThrow(
        /Skill input/u,
      );
    }
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("binds approval amount and known-payee status into both preparation and consumption", async () => {
    const authority = new SingleUseAuthority(() => true);
    const context = {
      ...baseContext,
      approvalAmount: { currency: "SGD", minorUnits: 2_000 },
      knownPayee: false,
    };
    const dispatcher: SkillActionDispatcher = {
      dispatch: async (action) => ({ evidence: `proof:${action.id}` }),
    };
    await executeSkill("sg.iras-noa", input, context, dispatcher, authority);
    await executeSkill("sg.iras-noa", input, context, dispatcher, authority, "grant-1");

    expect(authority.preparations[0]).toMatchObject({
      amount: { currency: "SGD", minorUnits: 2_000 },
      knownPayee: false,
    });
    expect(authority.requests[0]).toMatchObject({
      amount: { currency: "SGD", minorUnits: 2_000 },
      knownPayee: false,
    });
  });
});

class SingleUseAuthority implements SkillApprovalAuthority {
  readonly preparations: SkillApprovalPreparation[] = [];
  readonly requests: SkillApprovalRequest[] = [];
  #consumed = false;

  constructor(private readonly matches: (request: SkillApprovalRequest) => boolean) {}

  async prepare(request: SkillApprovalPreparation) {
    this.preparations.push(request);
    return { status: "approval_required" as const, approvalCardId: "card-1" };
  }

  async consumeAndExecute<T>(
    request: SkillApprovalRequest,
    execute: () => Promise<T>,
  ): Promise<{ status: "approved"; value: T } | { status: "rejected"; reason: string }> {
    this.requests.push(request);
    if (request.grantId !== "grant-1")
      return { status: "rejected", reason: "approval grant mismatch" };
    if (this.#consumed) return { status: "rejected", reason: "approval already consumed" };
    if (!this.matches(request))
      return { status: "rejected", reason: "authoritative binding mismatch" };
    this.#consumed = true;
    return { status: "approved", value: await execute() };
  }
}

class AutoAuthority implements SkillApprovalAuthority {
  readonly consumedGrantIds: string[] = [];

  async prepare() {
    return { status: "authorized" as const, grantId: "auto-grant-1" };
  }

  async consumeAndExecute<T>(
    request: SkillApprovalRequest,
    execute: () => Promise<T>,
  ): Promise<{ status: "approved"; value: T }> {
    this.consumedGrantIds.push(request.grantId);
    return { status: "approved", value: await execute() };
  }
}

function sameBinding(left: SkillApprovalPreparation, right: SkillApprovalPreparation): boolean {
  return (
    left.skillId === right.skillId &&
    left.category === right.category &&
    left.householdId === right.householdId &&
    left.personId === right.personId &&
    left.approvalActionId === right.approvalActionId &&
    left.commitActionId === right.commitActionId &&
    left.commitTarget === right.commitTarget &&
    left.materialFingerprint === right.materialFingerprint
  );
}
