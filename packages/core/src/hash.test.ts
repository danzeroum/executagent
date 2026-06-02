import { describe, it, expect } from "vitest";
import { sha256Hex, signHmacHex, verifyHmacHex } from "./hash.ts";

const bytes = new TextEncoder().encode("executagent artifact bytes");

describe("hash", () => {
  it("produces a stable 64-char sha256 hex", async () => {
    const h = await sha256Hex(bytes);
    expect(h).toHaveLength(64);
    expect(h).toBe(await sha256Hex(bytes));
  });

  it("signs and verifies with HMAC", async () => {
    const sig = await signHmacHex(bytes, "secret-key");
    expect(await verifyHmacHex(bytes, "secret-key", sig)).toBe(true);
  });

  it("rejects a tampered signature or wrong key", async () => {
    const sig = await signHmacHex(bytes, "secret-key");
    expect(await verifyHmacHex(bytes, "wrong-key", sig)).toBe(false);
    const tampered = new TextEncoder().encode("executagent artifact bytez");
    expect(await verifyHmacHex(tampered, "secret-key", sig)).toBe(false);
  });
});
