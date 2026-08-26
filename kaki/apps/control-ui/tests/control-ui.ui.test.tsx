// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import Home from "../app/page.js";
import type { KakiControlSnapshot, KakiGatewayClient } from "../app/gateway.js";
import RootLayout, { generateMetadata } from "../app/layout.js";
import { setHeaderValues } from "./stubs/next-headers.js";

const roots: Root[] = [];

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(async () => {
  await act(async () => {
    for (const root of roots.splice(0)) root.unmount();
  });
  delete window.__KAKI_GATEWAY__;
  window.history.replaceState(null, "", "/");
});

it("hydrates every live tab and sends owner actions with current approval facts", async () => {
  const perform = vi.fn(async () => ({
    ok: true,
    message: "Recorded by Gateway.",
    snapshot,
  }));
  const unsubscribe = vi.fn();
  const client: KakiGatewayClient = {
    snapshot: vi.fn(async () => snapshot),
    perform,
    subscribe: vi.fn(() => unsubscribe),
  };
  const container = await render(client);
  expect(container.textContent).toContain("Hello, Operator.");
  expect(container.textContent).toContain("Connected to the household Gateway.");

  for (const tab of [
    "Household",
    "Approvals",
    "Phone",
    "Journey",
    "Skills",
    "Locale",
    "Cost",
    "Traces",
    "Monitors",
  ]) {
    await click(button(container, tab));
    expect(button(container, tab).getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe(`#${tab.toLowerCase()}`);
  }

  await click(button(container, "Approvals"));
  await click(button(container, "Approve"));
  expect(perform).toHaveBeenCalledWith({
    type: "approval.decide",
    id: "approval-1",
    decision: "approved",
    factsHash: "a".repeat(64),
  });
  await click(button(container, "Pause Kaki"));

  await click(button(container, "Household"));
  await click(button(container, "Edit"));
  await click(button(container, "Phone"));
  await click(button(container, "screenshot"));
  await click(button(container, "Journey"));
  await click(button(container, "Delete"));
  await click(button(container, "Skills"));
  await click(button(container, "Save draft"));

  await click(button(container, "Locale"));
  const locale = container.querySelector<HTMLSelectElement>("#locale-select")!;
  locale.value = "my";
  await change(locale);

  await click(button(container, "Traces"));
  const trace = container.querySelector<HTMLInputElement>('input[type="range"]')!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(trace, "2");
  await input(trace);

  await click(button(container, "Monitors"));
  const monitor = container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
  await click(monitor);

  expect(perform.mock.calls.map(([action]) => action.type)).toEqual(
    expect.arrayContaining([
      "system.pause",
      "household.edit",
      "phone.command",
      "journey.delete",
      "skill.save-draft",
      "locale.set",
      "trace.position",
      "monitor.set",
    ]),
  );
  expect(container.textContent).toContain("Recorded by Gateway.");
  await act(async () => roots[0]?.unmount());
  roots.length = 0;
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it("shows connection and action failures without inventing household data", async () => {
  const failedSnapshot: KakiGatewayClient = {
    snapshot: async () => {
      throw new Error("offline");
    },
    perform: vi.fn(),
  };
  const disconnected = await render(failedSnapshot);
  expect(disconnected.textContent).toContain("Gateway connection failed: offline");
  expect(disconnected.textContent).toContain("Live data is not loaded");

  await act(async () => roots.shift()?.unmount());
  const failedAction: KakiGatewayClient = {
    snapshot: async () => snapshot,
    perform: async () => {
      throw new Error("denied");
    },
  };
  const connected = await render(failedAction);
  await click(button(connected, "Pause Kaki"));
  expect(connected.textContent).toContain("Action failed: denied. Check Gateway status and retry.");
  expect(connected.textContent).not.toContain("Wei Ling");
});

it("renders safe metadata for forwarded and local hosts", async () => {
  setHeaderValues({ "x-forwarded-host": "kaki.household.test", "x-forwarded-proto": "https" });
  await expect(generateMetadata()).resolves.toMatchObject({
    title: "Kaki · Household control centre",
    openGraph: { images: [{ url: "https://kaki.household.test/og.png" }] },
  });
  setHeaderValues({ host: "localhost:3000" });
  await expect(generateMetadata()).resolves.toMatchObject({
    openGraph: { images: [{ url: "http://localhost:3000/og.png" }] },
  });
  const markup = renderToStaticMarkup(
    <RootLayout>
      <span>Child</span>
    </RootLayout>,
  );
  expect(markup).toContain('<html lang="en-SG">');
  expect(markup).toContain('<body class="font-sans font-mono"><span>Child</span>');
});

async function render(client: KakiGatewayClient): Promise<HTMLDivElement> {
  window.__KAKI_GATEWAY__ = client;
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => {
    root.render(<Home />);
    await Promise.resolve();
  });
  return container;
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click());
}

async function change(element: HTMLElement): Promise<void> {
  await act(async () => element.dispatchEvent(new Event("change", { bubbles: true })));
}

async function input(element: HTMLElement): Promise<void> {
  await act(async () => element.dispatchEvent(new Event("input", { bubbles: true })));
}

function button(container: ParentNode, label: string): HTMLButtonElement {
  const match = [...container.querySelectorAll("button")].find((entry) =>
    entry.textContent?.trim().startsWith(label),
  );
  if (!(match instanceof HTMLButtonElement)) throw new Error(`Missing button: ${label}`);
  return match;
}

const snapshot: KakiControlSnapshot = {
  householdName: "Test household",
  operatorName: "Operator",
  paused: false,
  health: { state: "steady", checkedAt: "2026-08-26T00:00:00Z" },
  household: [
    {
      id: "person-1",
      initials: "OP",
      name: "Operator",
      relation: "owner",
      language: "English",
      detail: "Singapore",
    },
  ],
  approvals: [
    {
      id: "approval-1",
      factsHash: "a".repeat(64),
      title: "Ride",
      detail: "To town",
      amount: "S$10",
      evidence: "Redacted route",
      state: "pending",
    },
  ],
  phone: {
    connected: true,
    name: "Assistant phone",
    batteryPercent: 80,
    frameUrl: "/frames/latest.png",
    summary: "Ready",
  },
  journey: [{ id: "journey-1", time: "08:00", title: "Ride", detail: "Prepared" }],
  skills: [{ id: "skill-1", source: "maintained", instructions: "Stop before booking." }],
  locale: {
    active: "sg",
    available: ["sg", "my"],
    preview: "Can.",
    currency: "SGD",
    timeZone: "Asia/Singapore",
  },
  cost: { month: "S$1", today: "S$0.10", localShare: "80%", budgetRemaining: "S$9" },
  traces: [
    {
      id: "trace-1",
      title: "Ride trace",
      steps: [
        { title: "Open", evidence: "Frame 1" },
        { title: "Review", evidence: "Frame 2" },
      ],
    },
  ],
  monitors: [{ id: "rain", title: "Rain", detail: "Commute", status: "clear", enabled: true }],
};
