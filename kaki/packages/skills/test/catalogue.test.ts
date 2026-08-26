import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface CatalogueEntry {
  readonly scope: string;
  readonly slug: string;
  readonly title: string;
  readonly surface: string;
  readonly approval: string;
  readonly id: string;
  readonly provider: string;
  readonly requiredInputs: readonly string[];
  readonly actions: ReadonlyArray<{
    readonly id: string;
    readonly surface: string;
    readonly operation: string;
    readonly target: string;
    readonly produces: string;
  }>;
  readonly checks: readonly string[];
  readonly result: string;
}

interface Catalogue {
  readonly skills: readonly CatalogueEntry[];
  readonly phoneSkills: readonly string[];
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalogue = JSON.parse(readFileSync(join(root, "catalogue.json"), "utf8")) as Catalogue;

const requiredByScope: Readonly<Record<string, readonly string[]>> = {
  sg: [
    "iras-noa",
    "iras-file-assist",
    "cpf-overview",
    "cpf-topup",
    "srs-topup",
    "hdb-portal",
    "lta-vehicle",
    "ura-parking",
    "sp-group",
    "town-council-scc",
    "ica-passport-renewal",
    "mom-helper-levy-wp",
    "singpass-myinfo-self",
    "polyclinic-booking",
    "healthhub-web",
    "chas-clinic-finder",
    "medication-reminders",
    "elderly-care-sg",
    "school-calendar-sg",
    "enrichment-booking",
    "kids-sea",
    "helper-schedule",
    "household-ops",
    "kopi-order",
    "hawker-finder",
    "bus-mrt-now",
    "weather-commute",
    "haze-watch",
    "nlb",
    "activesg",
    "moving-house-sg",
    "shopee-web",
    "lazada-web",
    "amazon-sg",
    "carousell-buy-sell",
    "airline-sq",
    "scoot",
    "agoda",
    "klook",
    "trip-sea",
    "vendor-outreach",
    "contractor-followup",
    "tuition-agency",
    "family-events",
    "birthday-gift-sg",
    "wedding-sea",
  ],
  sea: [
    "currency-remittance",
    "cross-border-qr",
    "halal-finder",
    "prayer-times",
    "jb-commute",
    "visa-check-sea",
    "regional-holidays",
    "language-bridge",
  ],
  my: ["duitnow-pay", "tng-topup", "jpj-roadtax", "lhdn-tax", "myeg"],
  id: ["qris-pay", "gojek-ride", "tokopedia", "pln-bill", "bpjs"],
  th: ["promptpay-pay", "line-man", "bts-mrt", "revenue-dept", "tmd-weather"],
  vn: ["vietqr-pay", "zalo-ops", "momo-read", "evn-bill", "vneid-handoff"],
  ph: ["qrph-pay", "gcash-read", "egovph", "meralco-bill", "pagasa-weather"],
};

describe("skill inventory", () => {
  it("contains every required scope and every named prompt skill", () => {
    expect(
      readdirSync(root, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            ["sg", "sea", "my", "id", "th", "vn", "ph", "learned"].includes(entry.name),
        )
        .map((entry) => entry.name)
        .sort(),
    ).toEqual(["id", "learned", "my", "ph", "sea", "sg", "th", "vn"]);
    for (const [scope, slugs] of Object.entries(requiredByScope)) {
      const actual = catalogue.skills
        .filter((skill) => skill.scope === scope)
        .map((skill) => skill.slug)
        .sort();
      expect(actual, scope).toEqual([...slugs].sort());
      if (!["sg", "sea"].includes(scope)) expect(actual.length, scope).toBeGreaterThanOrEqual(5);
    }
    expect(catalogue.skills).toHaveLength(79);
    expect(new Set(catalogue.skills.map((skill) => skill.id)).size).toBe(79);
  });

  it.each(catalogue.skills)(
    "validates $id playbook, declared actions, runner, and fixture",
    (skill) => {
      const directory = join(root, skill.scope, skill.slug);
      const markdown = readFileSync(join(directory, "SKILL.md"), "utf8");
      const frontMatter = markdown.match(/^---\n([\s\S]+?)\n---/u)?.[1] ?? "";
      for (const field of [
        "id",
        "title",
        "when_to_use",
        "inputs",
        "surfaces",
        "approvals",
        "locales",
        "languages",
        "version",
      ]) {
        expect(frontMatter, `${skill.id}:${field}`).toMatch(new RegExp(`^${field}:\\s*\\S`, "mu"));
      }
      expect(frontMatter).toContain(`id: ${skill.id}`);
      expect(markdown).toMatch(
        /## Provider and outcome[\s\S]+## Steps[\s\S]+## Checks[\s\S]+## Failure modes[\s\S]+## Localised handoff/u,
      );
      expect(markdown).toContain(`Provider or owner: **${skill.provider}**`);
      expect(markdown).toContain(`Successful outcome: ${skill.result}`);
      expect(markdown).toMatch(/untrusted data/u);
      expect(markdown).toMatch(/Fixture mode makes zero external calls/u);
      expect(readFileSync(join(directory, "run.ts"), "utf8")).toContain(`"${skill.id}"`);
      expect(skill.actions.length).toBeGreaterThanOrEqual(3);
      expect(skill.requiredInputs.length).toBeGreaterThan(0);
      expect(skill.checks[0], `${skill.id}:specific check`).not.toMatch(/^Confirm names, dates/u);
      for (const action of skill.actions) {
        expect(markdown).toContain(`**${action.surface}.${action.operation}**`);
        expect(action.target.length, `${skill.id}:${action.id}:target`).toBeGreaterThan(3);
        expect(action.target, `${skill.id}:${action.id}:target`).not.toMatch(/fixture request/iu);
        expect(action.produces.length, `${skill.id}:${action.id}:produces`).toBeGreaterThan(8);
      }

      const fixture = JSON.parse(
        readFileSync(join(directory, "fixtures", "happy.json"), "utf8"),
      ) as {
        skillId?: string;
        input?: Record<string, unknown>;
        context?: { fixture?: boolean };
        expect?: {
          status?: string;
          approval?: string;
          actionIds?: unknown[];
          evidence?: unknown[];
        };
      };
      expect(fixture.skillId).toBe(skill.id);
      expect(fixture.context?.fixture).toBe(true);
      expect(["completed", "needs_approval"]).toContain(fixture.expect?.status);
      expect(fixture.expect?.approval).toBe(skill.approval);
      expect(fixture.expect?.actionIds?.length).toBeGreaterThan(0);
      expect(fixture.expect?.evidence?.length).toBeGreaterThan(0);
      expect(fixture.input?.request).not.toBe(`fixture request for ${skill.title}`);
      for (const input of skill.requiredInputs) expect(fixture.input?.[input]).toBeTruthy();
    },
  );

  it("does not generate duplicate generic playbook bodies", () => {
    const bodies = catalogue.skills.map((skill) => {
      const markdown = readFileSync(join(root, skill.scope, skill.slug, "SKILL.md"), "utf8");
      return markdown.replace(/^---\n[\s\S]+?\n---\n/u, "").trim();
    });
    expect(new Set(bodies).size).toBe(catalogue.skills.length);
    for (const body of bodies) {
      expect(body).not.toContain("Use the declared surface to gather current data");
      expect(body).not.toContain("Return the verified result without performing unrelated actions");
    }
  });

  it("declares an approval action before every risky commit", () => {
    for (const skill of catalogue.skills) {
      const approvalIndex = skill.actions.findIndex((action) => action.surface === "approval");
      const commitIndex = skill.actions.findIndex((action) => action.operation === "commit");
      if (skill.approval === "none") {
        expect(approvalIndex, skill.id).toBe(-1);
        expect(commitIndex, skill.id).toBe(-1);
      } else {
        expect(approvalIndex, skill.id).toBeGreaterThan(0);
        expect(commitIndex, skill.id).toBeGreaterThan(approvalIndex);
      }
    }
  });
});

describe("phone skill catalogue", () => {
  it("catalogues every existing phone-node playbook without duplicating ownership", () => {
    expect(catalogue.phoneSkills).toHaveLength(11);
    for (const slug of catalogue.phoneSkills) {
      const directory = join(root, "..", "phone-node", "skills", slug);
      const markdown = readFileSync(join(directory, "SKILL.md"), "utf8");
      const fixture = JSON.parse(
        readFileSync(join(directory, "fixtures", "happy.json"), "utf8"),
      ) as {
        goal?: string;
        screens?: unknown[];
        expect?: { terminal?: string; evidence?: string; risk?: string };
      };
      expect(markdown).toContain(`id: phone.${slug}`);
      expect(markdown).toMatch(/^inputs:\s*\[[^\]]+\]/mu);
      expect(markdown).toMatch(/^approvals:\s*\[[^\]]*\]/mu);
      expect(markdown.length, `phone.${slug}:substantive body`).toBeGreaterThan(350);
      expect(fixture.goal?.length, `phone.${slug}:goal`).toBeGreaterThan(10);
      expect(fixture.screens?.length, `phone.${slug}:screens`).toBeGreaterThan(0);
      expect(fixture.expect?.terminal, `phone.${slug}:terminal`).toBeTruthy();
      expect(fixture.expect?.risk, `phone.${slug}:risk`).toBeTruthy();
    }
  });

  it("has no duplicate phone playbook bodies", () => {
    const bodies = catalogue.phoneSkills.map((slug) =>
      readFileSync(join(root, "..", "phone-node", "skills", slug, "SKILL.md"), "utf8"),
    );
    expect(new Set(bodies).size).toBe(catalogue.phoneSkills.length);
  });
});
