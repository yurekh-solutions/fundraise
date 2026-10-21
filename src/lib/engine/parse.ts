import { Decimal, HUNDRED, LIMITS } from "./decimal";

export type AmountUnit =
  "units" | "thousand" | "lakh" | "million" | "crore" | "billion";

export const UNIT_MULTIPLIER: Record<AmountUnit, string> = {
  units: "1",
  thousand: "1000",
  lakh: "100000",
  million: "1000000",
  crore: "10000000",
  billion: "1000000000",
};

export const UNIT_LABEL: Record<AmountUnit, string> = {
  units: "Units",
  thousand: "Thousand",
  lakh: "Lakh",
  million: "Million",
  crore: "Crore",
  billion: "Billion",
};

export const UNITS: AmountUnit[] = [
  "units",
  "thousand",
  "lakh",
  "million",
  "crore",
  "billion",
];

export type ParseResult =
  | { kind: "empty" }
  | { kind: "ok"; value: Decimal }
  | { kind: "error"; message: string };

/**
 * Strict numeric parsing. "." is always the decimal separator; "," and spaces are
 * accepted only as digit grouping. Anything else is rejected — never guessed.
 */
export function parseNumber(text: string | null | undefined): ParseResult {
  if (text == null) return { kind: "empty" };
  const raw = String(text).trim();
  if (raw === "") return { kind: "empty" };
  if (raw.length > 100)
    return {
      kind: "error",
      message: "Numeric input must be 100 characters or fewer.",
    };
  if (/[,\s_]/.test(raw)) {
    const unsigned = raw.replace(/^[-+]/, "");
    const integerPart = unsigned.split(".")[0];
    const groups = integerPart.split(/[,\s_]/);
    const international =
      /^\d{1,3}$/.test(groups[0]) &&
      groups.slice(1).every((g) => /^\d{3}$/.test(g));
    const indian =
      /^\d{1,2}$/.test(groups[0]) &&
      groups.slice(1, -1).every((g) => /^\d{2}$/.test(g)) &&
      /^\d{3}$/.test(groups.at(-1)!);
    if (
      groups.length < 2 ||
      (!international && !indian) ||
      /[,\s_]/.test(unsigned.split(".")[1] ?? "")
    )
      return {
        kind: "error",
        message:
          "Use valid digit grouping (1,000 or 1,00,000) and “.” for decimals.",
      };
  }
  const compact = raw.replace(/[\s,_]/g, "");
  if (!/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(compact)) {
    if (/^[-+]?\d{1,3}(\.\d{3})+,\d+$/.test(raw)) {
      return {
        kind: "error",
        message: "Use “.” for decimals and “,” for grouping (e.g. 1,000.50).",
      };
    }
    return {
      kind: "error",
      message:
        "Enter a number using digits, “,” for grouping and “.” for decimals.",
    };
  }
  if (/\.\d*,/.test(raw)) {
    return {
      kind: "error",
      message: "Grouping commas cannot appear after the decimal point.",
    };
  }
  const value = new Decimal(compact);
  if (!value.isFinite())
    return { kind: "error", message: "Value must be finite." };
  return { kind: "ok", value };
}

export interface AmountRule {
  allowZero?: boolean;
  allowNegative?: boolean;
  limit?: Decimal;
  label?: string;
}

export function parseAmount(
  text: string | null | undefined,
  unit: AmountUnit = "units",
  rule: AmountRule = {},
): ParseResult {
  const parsed = parseNumber(text);
  if (parsed.kind !== "ok") return parsed;
  const value = parsed.value.mul(UNIT_MULTIPLIER[unit]);
  return checkRange(value, rule);
}

export function checkRange(value: Decimal, rule: AmountRule = {}): ParseResult {
  const label = rule.label ?? "Value";
  if (!rule.allowNegative && value.isNeg() && !value.isZero())
    return { kind: "error", message: `${label} cannot be negative.` };
  if (!rule.allowZero && value.isZero())
    return { kind: "error", message: `${label} must be greater than zero.` };
  const limit = rule.limit ?? LIMITS.money;
  if (value.abs().gt(limit))
    return {
      kind: "error",
      message: `${label} exceeds the supported limit of ${limit.toFixed()}.`,
    };
  return { kind: "ok", value };
}

export interface PercentRule {
  /** Exclusive bounds 0 < x < 100 when true. */
  exclusive?: boolean;
  allowZero?: boolean;
  allowHundred?: boolean;
  label?: string;
}

/** Parses a UI percentage into a fraction. The ×/100 conversion happens exactly once, here. */
export function parsePercent(
  text: string | null | undefined,
  rule: PercentRule = {},
): ParseResult {
  const parsed = parseNumber(text);
  if (parsed.kind !== "ok") return parsed;
  const pct = parsed.value;
  const label = rule.label ?? "Percentage";
  if (rule.exclusive) {
    if (pct.lte(0) || pct.gte(100))
      return {
        kind: "error",
        message: `${label} must be strictly between 0% and 100%.`,
      };
  } else {
    if (pct.isNeg())
      return { kind: "error", message: `${label} cannot be negative.` };
    if (!rule.allowZero && pct.isZero())
      return { kind: "error", message: `${label} must be greater than 0%.` };
    if (pct.gt(100) || (!rule.allowHundred && pct.eq(100))) {
      return {
        kind: "error",
        message: rule.allowHundred
          ? `${label} cannot exceed 100%.`
          : `${label} must be below 100%.`,
      };
    }
  }
  return { kind: "ok", value: pct.div(HUNDRED) };
}

export function parseMonths(
  text: string | null | undefined,
  max = LIMITS.forecastMonths,
): ParseResult {
  const parsed = parseNumber(text);
  if (parsed.kind !== "ok") return parsed;
  if (parsed.value.isNeg())
    return { kind: "error", message: "Months cannot be negative." };
  if (parsed.value.gt(max))
    return { kind: "error", message: `Months cannot exceed ${max}.` };
  return parsed;
}

export function parseInteger(
  text: string | null | undefined,
  minV: number,
  maxV: number,
  label = "Value",
): ParseResult {
  const parsed = parseNumber(text);
  if (parsed.kind !== "ok") return parsed;
  if (!parsed.value.isInteger())
    return { kind: "error", message: `${label} must be a whole number.` };
  if (parsed.value.lt(minV) || parsed.value.gt(maxV))
    return {
      kind: "error",
      message: `${label} must be between ${minV} and ${maxV}.`,
    };
  return parsed;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) return "Name is required.";
  if (trimmed.length > LIMITS.nameLength)
    return `Name must be ${LIMITS.nameLength} characters or fewer.`;
  return null;
}

/** Strip a canonical amount back into draft text in the given unit (for basis / solve switches). */
export function toDraftText(
  value: Decimal,
  unit: AmountUnit = "units",
  dp = 6,
): string {
  const scaled = value.div(UNIT_MULTIPLIER[unit]);
  return scaled
    .toDecimalPlaces(dp)
    .toFixed()
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}
