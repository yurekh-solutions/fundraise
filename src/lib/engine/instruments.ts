import { Decimal, LIMITS, ONE, ZERO, min, str } from "./decimal";
import { AmountUnit, ParseResult, parseAmount, parsePercent } from "./parse";
import { FieldIssue, Section } from "./types";

/**
 * Conversion-instrument planning estimates: post-money SAFE and simple
 * convertible note. These are negotiation-planning approximations of standard
 * mechanics — not contract models. They deliberately live outside the priced
 * round engine, the storage schema and ENGINE_VERSION so existing saved
 * scenarios are never affected.
 */

export interface SafeInput {
  cap: string;
  investment: string;
  shares: string;
}
export interface NoteInput {
  cap: string;
  investment: string;
  shares: string;
  discount: string;
  rate: string;
  months: string;
  roundPrice: string;
}
export interface InstrumentResult {
  sections: Section[];
  /** True when the headline ownership result is available. */
  valid: boolean;
  headline: {
    ownership: string | null;
    price: string | null;
    shares: string | null;
  };
}

export const emptySafe: SafeInput = { cap: "", investment: "", shares: "" };
export const emptyNote: NoteInput = {
  cap: "",
  investment: "",
  shares: "",
  discount: "",
  rate: "",
  months: "",
  roundPrice: "",
};

function collectFields(
  defs: Array<{
    key: string;
    parsed: ParseResult;
    required?: boolean;
    blankAs?: Decimal;
  }>,
) {
  const errors: Record<string, string> = {};
  const values: Record<string, Decimal | null> = {};
  let invalid = false;
  let missingRequired = false;
  for (const def of defs) {
    const parsed = def.parsed;
    if (parsed.kind === "error") {
      errors[def.key] = parsed.message;
      invalid = true;
      values[def.key] = null;
    } else if (parsed.kind === "empty") {
      values[def.key] = def.blankAs ?? null;
      if (def.required) missingRequired = true;
    } else {
      values[def.key] = parsed.value;
    }
  }
  return { errors, values, invalid, missingRequired };
}

function issue(errors: Record<string, string>): FieldIssue[] {
  return Object.keys(errors).map((k) => ({
    field: k,
    message: errors[k],
    severity: "error" as const,
  }));
}

function headlineOf(
  ownership: Decimal | null,
  price: Decimal | null,
  shares: Decimal | null,
): InstrumentResult["headline"] {
  return {
    ownership: ownership == null ? null : str(ownership),
    price: price == null ? null : str(price),
    shares: shares == null ? null : str(shares),
  };
}

export function calculateSafe(
  input: SafeInput,
  unit: AmountUnit,
): InstrumentResult {
  const { errors, values, invalid, missingRequired } = collectFields([
    {
      key: "cap",
      parsed: parseAmount(input.cap, unit, { label: "Post-money cap" }),
      required: true,
    },
    {
      key: "investment",
      parsed: parseAmount(input.investment, unit, {
        label: "SAFE investment",
      }),
      required: true,
    },
    {
      key: "shares",
      parsed: parseAmount(input.shares, "units", {
        limit: LIMITS.shares,
        label: "Pre-round fully diluted shares",
      }),
    },
  ]);
  const section: Section = {
    id: "safe-conversion",
    title: "Conversion economics",
    status: invalid ? "invalid" : missingRequired ? "incomplete" : "valid",
    values: [],
    issues: issue(errors),
    trace: [
      {
        label: "Ownership",
        formula:
          "e = I / Cap — post-money SAFE: the cap is the post-money valuation",
      },
      {
        label: "Share issuance",
        formula:
          "price = Cap / S; new shares = I / price (S = pre-round fully diluted)",
      },
      {
        label: "Scope",
        formula:
          "One instrument; no option-pool expansion. Planning estimate, not a contract model.",
      },
    ],
  };
  let ownership: Decimal | null = null;
  let price: Decimal | null = null;
  let issued: Decimal | null = null;
  if (section.status === "valid") {
    const cap = values.cap!;
    const investment = values.investment!;
    if (investment.gte(cap)) {
      errors.cap = "Investment must be below the post-money cap.";
      section.status = "invalid";
      section.issues = issue(errors);
    } else {
      ownership = investment.div(cap);
      price = values.shares == null ? null : cap.div(values.shares);
      issued = price == null ? null : investment.div(price);
      section.values = [
        {
          key: "ownership",
          label: "New investor ownership",
          value: str(ownership),
          kind: "percent",
        },
        {
          key: "impliedPost",
          label: "Implied post-money (the cap)",
          value: str(cap),
          kind: "money",
        },
        {
          key: "impliedPre",
          label: "Priced-round equivalent pre-money",
          value: str(cap.sub(investment)),
          kind: "money",
          note: "When several instruments convert together, aggregate economics differ.",
        },
        {
          key: "price",
          label: "Conversion price per share",
          value: price == null ? null : str(price),
          kind: "price",
          note:
            price == null
              ? "Enter pre-round fully diluted shares to add share issuance."
              : undefined,
        },
        {
          key: "newShares",
          label: "Shares issued on conversion",
          value: issued == null ? null : str(issued),
          kind: "shares",
        },
      ];
    }
  }
  if (section.status === "incomplete")
    section.summary =
      "Enter the post-money cap and the SAFE investment to see the conversion.";
  return {
    sections: [section],
    valid: section.status === "valid" && ownership != null,
    headline: headlineOf(ownership, price, issued),
  };
}

export function calculateNote(
  input: NoteInput,
  unit: AmountUnit,
): InstrumentResult {
  const base = collectFields([
    {
      key: "investment",
      parsed: parseAmount(input.investment, unit, {
        label: "Principal investment",
      }),
      required: true,
    },
    {
      key: "rate",
      parsed: parsePercent(input.rate, {
        allowZero: true,
        label: "Annual interest rate",
      }),
      blankAs: ZERO,
    },
    {
      key: "months",
      parsed: parseAmount(input.months, "units", {
        allowZero: true,
        label: "Months to conversion",
      }),
      blankAs: ZERO,
    },
  ]);
  const accrual: Section = {
    id: "note-accrual",
    title: "Interest & amount owed",
    status: base.invalid
      ? "invalid"
      : base.missingRequired
        ? "incomplete"
        : "valid",
    values: [],
    issues: issue(base.errors),
    trace: [
      {
        label: "Simple interest",
        formula: "A = I × (1 + r × m / 12) — no compounding",
      },
    ],
  };
  let accrued: Decimal | null = null;
  if (accrual.status === "valid") {
    accrued = base.values.investment!.mul(
      ONE.add(base.values.rate!.mul(base.values.months!).div(12)),
    );
    if (accrued.gt(LIMITS.money)) {
      base.errors.investment =
        "Accrued amount exceeds the supported 10¹⁵ limit.";
      accrual.status = "invalid";
      accrual.issues = issue(base.errors);
      accrued = null;
    } else {
      accrual.values = [
        {
          key: "accrued",
          label: "Amount owed at conversion",
          value: str(accrued),
          kind: "money",
        },
        {
          key: "interest",
          label: "Accrued interest",
          value: str(accrued.sub(base.values.investment!)),
          kind: "money",
        },
      ];
    }
  }
  if (accrual.status === "incomplete")
    accrual.summary =
      "Enter the principal investment to compute the amount owed at conversion.";
  const conv = collectFields([
    {
      key: "cap",
      parsed: parseAmount(input.cap, unit, { label: "Valuation cap" }),
      required: true,
    },
    {
      key: "shares",
      parsed: parseAmount(input.shares, "units", {
        limit: LIMITS.shares,
        label: "Pre-round fully diluted shares",
      }),
      required: true,
    },
    {
      key: "discount",
      parsed: parsePercent(input.discount, {
        allowZero: true,
        label: "Discount",
      }),
      blankAs: ZERO,
    },
    {
      key: "roundPrice",
      parsed: parseAmount(input.roundPrice, unit, {
        label: "Next-round price per share",
      }),
    },
  ]);
  const conversion: Section = {
    id: "note-conversion",
    title: "Conversion economics",
    status: conv.invalid
      ? "invalid"
      : conv.missingRequired || accrued == null
        ? "incomplete"
        : "valid",
    values: [],
    issues: issue(conv.errors),
    trace: [
      {
        label: "Conversion price legs",
        formula: "cap price = Cap / S; discount price = round price × (1 − d)",
      },
      {
        label: "Applied price",
        formula:
          "applied = min(cap price, discount price) — the lower price governs",
      },
      {
        label: "Shares & ownership",
        formula: "new = A / applied; e = new / (S + new)",
      },
      {
        label: "Scope",
        formula:
          "One instrument, simple interest, no pool expansion. Planning estimate, not a contract model.",
      },
    ],
  };
  let ownership: Decimal | null = null;
  let applied: Decimal | null = null;
  let issued: Decimal | null = null;
  if (conversion.status === "valid") {
    const cap = conv.values.cap!;
    const shares = conv.values.shares!;
    const capPrice = cap.div(shares);
    const discountPrice =
      conv.values.roundPrice == null
        ? null
        : conv.values.roundPrice.mul(ONE.sub(conv.values.discount!));
    if (discountPrice != null && discountPrice.lte(0)) {
      conv.errors.roundPrice = "The discounted price must stay above zero.";
      conversion.status = "invalid";
      conversion.issues = issue(conv.errors);
    } else {
      applied = discountPrice == null ? capPrice : min(capPrice, discountPrice);
      issued = accrued!.div(applied);
      ownership = issued.div(shares.add(issued));
      conversion.values = [
        {
          key: "accruedEcho",
          label: "Amount owed at conversion",
          value: str(accrued!),
          kind: "money",
        },
        {
          key: "capPrice",
          label: "Cap price per share",
          value: str(capPrice),
          kind: "price",
        },
        {
          key: "discountPrice",
          label: "Discount price per share",
          value: discountPrice == null ? null : str(discountPrice),
          kind: "price",
          note:
            discountPrice == null
              ? "Enter the next-round price per share to test the discount leg."
              : undefined,
        },
        {
          key: "appliedPrice",
          label: "Applied conversion price",
          value: str(applied),
          kind: "price",
          note:
            discountPrice == null
              ? "Cap-only conversion — no next-round price entered."
              : discountPrice.lt(capPrice)
                ? "Lower of the two legs: the discount governs."
                : "Lower of the two legs: the cap governs.",
        },
        {
          key: "newShares",
          label: "Shares issued on conversion",
          value: str(issued),
          kind: "shares",
        },
        {
          key: "ownership",
          label: "New investor ownership",
          value: str(ownership),
          kind: "percent",
        },
      ];
    }
  }
  if (conversion.status === "incomplete")
    conversion.summary =
      "Conversion needs the valuation cap, pre-round fully diluted shares and the accrued amount.";
  return {
    sections: [accrual, conversion],
    valid: conversion.status === "valid" && ownership != null,
    headline: headlineOf(ownership, applied, issued),
  };
}
