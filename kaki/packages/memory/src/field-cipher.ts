import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ENVELOPE_VERSION = "v1";
const MAX_SEARCH_TOKENS = 256;
const MAX_SEARCH_TOKEN_LENGTH = 64;

export interface HouseholdKeyBroker {
  /** Returns exactly 32 bytes from the host keychain/KMS; callers never persist this value. */
  getHouseholdKey(householdId: string): Promise<Uint8Array>;
}

export class HouseholdFieldCipher {
  public constructor(private readonly keys: HouseholdKeyBroker) {}

  public async encrypt(householdId: string, context: string, plaintext: string): Promise<string> {
    const key = await this.key(householdId, "encryption");
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(this.aad(householdId, context)));
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [
      ENVELOPE_VERSION,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  public async decrypt(householdId: string, context: string, envelope: string): Promise<string> {
    const parts = envelope.split(".");
    if (parts.length !== 4 || parts[0] !== ENVELOPE_VERSION)
      throw new Error("memory-ciphertext-invalid");
    const [, encodedIv, encodedTag, encodedCiphertext] = parts;
    if (!encodedIv || !encodedTag || !encodedCiphertext)
      throw new Error("memory-ciphertext-invalid");
    const key = await this.key(householdId, "encryption");
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encodedIv, "base64url"));
      decipher.setAAD(Buffer.from(this.aad(householdId, context)));
      decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("memory-ciphertext-authentication-failed");
    }
  }

  public async searchTokens(householdId: string, text: string): Promise<string> {
    const key = await this.key(householdId, "search-index");
    return lexicalTokens(text)
      .map((token) => createHmac("sha256", key).update(token).digest("hex"))
      .join(" ");
  }

  public async speakerFingerprint(
    householdId: string,
    channel: string,
    jid: string,
  ): Promise<string> {
    const key = await this.key(householdId, "speaker-index");
    return createHmac("sha256", key).update(`${channel}\u0000${jid}`).digest("hex");
  }

  private async key(householdId: string, purpose: string): Promise<Buffer> {
    if (!householdId.trim()) throw new Error("memory-household-required");
    const root = Buffer.from(await this.keys.getHouseholdKey(householdId));
    if (root.byteLength !== 32) throw new Error("memory-household-key-must-be-32-bytes");
    try {
      return createHmac("sha256", root).update(`kaki-memory:${purpose}`).digest();
    } finally {
      root.fill(0);
    }
  }

  private aad(householdId: string, context: string): string {
    return `${ENVELOPE_VERSION}\u0000${householdId}\u0000${context}`;
  }
}

function lexicalTokens(text: string): string[] {
  return [
    ...new Set(
      [
        ...text
          .normalize("NFKC")
          .toLocaleLowerCase("und")
          .matchAll(/[\p{L}\p{N}]+/gu),
      ].map((match) => match[0].slice(0, MAX_SEARCH_TOKEN_LENGTH)),
    ),
  ]
    .sort()
    .slice(0, MAX_SEARCH_TOKENS);
}
