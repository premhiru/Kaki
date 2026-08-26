import { randomUUID } from "node:crypto";
import { isIP } from "node:net";

export interface LocalQrAccessRequest {
  readonly remoteAddress: string;
  readonly sessionId?: string;
}

export interface PublishedLocalQr {
  readonly id: string;
  readonly localPath: string;
  readonly expiresAt: string;
}

export interface TrustedLocalQrSink {
  publish(qr: string, now?: Date): Promise<PublishedLocalQr>;
}

/**
 * Keeps pairing material out of channels, logs, and alerts. The QR can only be
 * redeemed by an authenticated request that also originates on loopback.
 */
export class TrustedLocalQrSurface implements TrustedLocalQrSink {
  readonly #entries = new Map<string, { qr: string; expiresAt: number }>();

  constructor(
    private readonly authenticate: (request: LocalQrAccessRequest) => boolean,
    private readonly ttlMs = 2 * 60 * 1000,
    private readonly id: () => string = randomUUID,
  ) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) throw new Error("invalid-qr-ttl");
  }

  async publish(qr: string, now = new Date()): Promise<PublishedLocalQr> {
    if (!qr.trim()) throw new Error("empty-whatsapp-qr");
    this.#entries.clear();
    const id = this.id();
    const expiresAt = now.getTime() + this.ttlMs;
    this.#entries.set(id, { qr, expiresAt });
    return {
      id,
      localPath: `/local/whatsapp/qr/${encodeURIComponent(id)}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  read(id: string, request: LocalQrAccessRequest, now = new Date()): string {
    if (!isLoopback(request.remoteAddress) || !this.authenticate(request))
      throw new Error("whatsapp-qr-access-denied");
    const entry = this.#entries.get(id);
    if (!entry || entry.expiresAt <= now.getTime()) {
      this.#entries.delete(id);
      throw new Error("whatsapp-qr-expired");
    }
    return entry.qr;
  }

  revoke(id: string): void {
    this.#entries.delete(id);
  }

  revokeAll(): void {
    this.#entries.clear();
  }
}

function isLoopback(address: string): boolean {
  const value = address.trim().toLowerCase();
  if (value === "::1") return true;
  const ipv4 = value.startsWith("::ffff:") ? value.slice("::ffff:".length) : value;
  return isIP(ipv4) === 4 && ipv4.startsWith("127.");
}
