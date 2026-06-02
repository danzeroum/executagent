// Deno runtime mirror of packages/core/src/hash.ts (verbatim; unit-tested there).
// Artifact integrity: SHA-256 + HMAC signature. Web Crypto only, so the same
// code runs in Node 22 and Deno (edge functions). Signing key comes from Vault/env.

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return toHex(digest);
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signHmacHex(bytes: Uint8Array, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, bytes as unknown as BufferSource);
  return toHex(sig);
}

export async function verifyHmacHex(bytes: Uint8Array, secret: string, signatureHex: string): Promise<boolean> {
  const expected = await signHmacHex(bytes, secret);
  // length-safe constant-ish comparison
  if (expected.length !== signatureHex.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signatureHex.charCodeAt(i);
  return diff === 0;
}
