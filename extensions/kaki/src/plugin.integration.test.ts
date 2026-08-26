import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { ApprovalEngine, MemoryApprovalLedger } from "@kaki/approval-node";
import type {
  OpenClawPluginHttpRouteHandler,
  OpenClawPluginService,
} from "openclaw/plugin-sdk/core";
import type { PluginCommandContext } from "openclaw/plugin-sdk/plugin-entry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createKakiApprovalOwner } from "./package-owners.js";
import { createKakiPlugin } from "./plugin.js";
import { createTestOwners, validPluginConfig } from "./test-support.js";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

function commandContext(args: string): PluginCommandContext {
  return {
    args,
    channel: "telegram",
    commandBody: "",
    config: {},
    isAuthorizedSender: true,
    senderIsOwner: true,
    requestConversationBinding: async () => ({ ok: false, error: "unused" }) as never,
    detachConversationBinding: async () => ({ removed: false }),
    getCurrentConversationBinding: async () => null,
  };
}

describe("Kaki plugin owner lifecycle", () => {
  it("starts package-backed owners and delegates snapshot, HTTP action, and Telegram command", async () => {
    const ledger = new MemoryApprovalLedger();
    const seed = new ApprovalEngine(ledger);
    const first = await seed.create({
      taskId: "task-http",
      householdId: "household-1",
      title: "HTTP approval",
      summary: "Approve from the authenticated control route.",
      category: "booking",
      requestedByPersonId: "person-1",
    });
    const second = await seed.create({
      taskId: "task-command",
      householdId: "household-1",
      title: "Telegram approval",
      summary: "Deny from the authenticated Telegram command.",
      category: "booking",
      requestedByPersonId: "person-1",
    });
    const approvals = createKakiApprovalOwner({
      ledger,
      householdId: "household-1",
      authorizeDecision: ({ personId }) => personId === "person-1",
    });
    const routes = new Map<string, OpenClawPluginHttpRouteHandler>();
    const commands: Array<{
      name: string;
      handler: (ctx: PluginCommandContext) => Promise<unknown>;
    }> = [];
    let service: OpenClawPluginService | undefined;
    createKakiPlugin({
      ownerFactory: async () => createTestOwners({ approvals }),
    }).register({
      pluginConfig: validPluginConfig,
      logger: { warn: vi.fn() },
      registerHttpRoute(route) {
        routes.set(route.path, route.handler);
      },
      registerCommand(command) {
        commands.push(command as (typeof commands)[number]);
      },
      registerService(value) {
        service = value;
      },
      registerCli() {},
      registerTool() {},
      session: { controls: { registerControlUiDescriptor() {} } },
    } as never);
    expect(service).toBeDefined();
    await service!.start({} as never);

    const server = createServer((req, res) => {
      const handler = routes.get(req.url ?? "");
      if (handler) void handler(req, res);
      else res.end();
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${address.port}`;

    const snapshot = await fetch(`${base}/api/kaki/snapshot`);
    expect(snapshot.status).toBe(200);
    expect(await snapshot.json()).toMatchObject({
      approvals: expect.arrayContaining([
        expect.objectContaining({ id: first.id, factsHash: first.factsHash }),
      ]),
    });

    const action = await fetch(`${base}/api/kaki/action`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-kaki-intent": "operator-action",
      },
      body: JSON.stringify({
        type: "approval.decide",
        id: first.id,
        decision: "approved",
        factsHash: first.factsHash,
      }),
    });
    expect(action.status).toBe(200);
    expect(await action.json()).toMatchObject({ ok: true });

    const deny = commands.find((command) => command.name === "deny")!;
    await expect(deny.handler(commandContext(`${second.id} ${second.factsHash}`))).resolves.toEqual(
      {
        text: `Approval ${second.id} is denied.`,
      },
    );

    await service!.stop?.({} as never);
    expect((await fetch(`${base}/api/kaki/snapshot`)).status).toBe(503);
  });
});
