// PII detection + redaction for text artifacts and text metadata. Runs AFTER
// generation (the model can regenerate PII even when input was clean). Regex-based
// MVP; in-image OCR PII detection is scale-vision (see docs/05-security.md).

export type PiiType = "EMAIL" | "CPF" | "CNPJ" | "PHONE_BR";

interface PiiPattern {
  type: PiiType;
  re: RegExp;
}

const PATTERNS: PiiPattern[] = [
  { type: "EMAIL", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { type: "CPF", re: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g },
  { type: "CNPJ", re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g },
  { type: "PHONE_BR", re: /\b(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g },
];

export interface PiiFinding {
  type: PiiType;
  count: number;
}

export interface RedactionResult {
  redacted: string;
  findings: PiiFinding[];
  hadPii: boolean;
}

export function redactPii(input: string): RedactionResult {
  let redacted = input;
  const findings: PiiFinding[] = [];
  // CNPJ before CPF is not required (distinct lengths), but order is deterministic.
  for (const { type, re } of PATTERNS) {
    let count = 0;
    redacted = redacted.replace(re, () => {
      count++;
      return `[REDACTED:${type}]`;
    });
    if (count > 0) findings.push({ type, count });
  }
  return { redacted, findings, hadPii: findings.length > 0 };
}
