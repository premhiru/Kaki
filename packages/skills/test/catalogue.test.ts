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
  it("contains every required scope and skill with five country starters", () => {
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
        .map((skill) => skill.slug);
      expect(actual.sort(), scope).toEqual([...slugs].sort());
      if (!["sg", "sea"].includes(scope)) expect(actual.length, scope).toBeGreaterThanOrEqual(5);
    }
    expect(catalogue.skills).toHaveLength(79);
  });

  it.each(catalogue.skills)("validates $id metadata, safety body, runner and fixture", (skill) => {
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
      /## Steps[\s\S]+## Checks[\s\S]+## Failure modes[\s\S]+## Localised handoff/u,
    );
    expect(markdown).toMatch(/untrusted input/u);
    expect(markdown).toMatch(/Fixture mode must make zero external calls/u);
    expect(readFileSync(join(directory, "run.ts"), "utf8")).toContain(`"${skill.id}"`);
    const fixture = JSON.parse(readFileSync(join(directory, "fixtures", "happy.json"), "utf8")) as {
      skillId?: string;
      context?: { fixture?: boolean };
      expect?: { status?: string; approval?: string; evidence?: unknown[] };
    };
    expect(fixture.skillId).toBe(skill.id);
    expect(fixture.context?.fixture).toBe(true);
    expect(["completed", "needs_approval"]).toContain(fixture.expect?.status);
    expect(fixture.expect?.approval).toBe(skill.approval);
    expect(fixture.expect?.evidence?.length).toBeGreaterThan(0);
  });
});

describe("phone skill catalogue", () => {
  it("catalogues each existing phone-node playbook without duplicating ownership", () => {
    expect(catalogue.phoneSkills).toHaveLength(11);
    for (const slug of catalogue.phoneSkills) {
      expect(
        readFileSync(join(root, "..", "phone-node", "skills", slug, "SKILL.md"), "utf8"),
      ).toContain(`id: phone.${slug}`);
    }
  });
});
