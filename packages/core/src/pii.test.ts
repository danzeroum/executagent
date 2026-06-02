import { describe, it, expect } from "vitest";
import { redactPii } from "./pii.ts";

describe("redactPii", () => {
  it("redacts emails", () => {
    const r = redactPii("contact joao@example.com please");
    expect(r.redacted).toContain("[REDACTED:EMAIL]");
    expect(r.redacted).not.toContain("joao@example.com");
    expect(r.hadPii).toBe(true);
    expect(r.findings).toContainEqual({ type: "EMAIL", count: 1 });
  });

  it("redacts a Brazilian CPF (formatted and bare)", () => {
    expect(redactPii("CPF 123.456.789-00").redacted).toContain("[REDACTED:CPF]");
    expect(redactPii("12345678900").redacted).toContain("[REDACTED:CPF]");
  });

  it("redacts CNPJ", () => {
    expect(redactPii("CNPJ 12.345.678/0001-99").redacted).toContain("[REDACTED:CNPJ]");
  });

  it("reports no PII for clean text", () => {
    const r = redactPii("a clean creative brief about a fintech brand");
    expect(r.hadPii).toBe(false);
    expect(r.redacted).toBe("a clean creative brief about a fintech brand");
  });
});
