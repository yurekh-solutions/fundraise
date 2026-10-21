import {
  D,
  Decimal,
  ENGINE_VERSION,
  HUNDRED,
  LIMITS,
  ONE,
  ZERO,
  max,
  str,
} from "./decimal";
import {
  AmountUnit,
  ParseResult,
  parseAmount,
  parseMonths,
  parsePercent,
} from "./parse";
import {
  Currency,
  FieldIssue,
  Notation,
  Provenance,
  Section,
  ValueKind,
} from "./types";

export type SolveFor = "equity" | "investment" | "valuation";
export type Basis = "pre" | "post";
export interface Draft {
  currency: Currency;
  notation: Notation;
  solveFor: SolveFor;
  basis: Basis;
  unit: AmountUnit;
  valuation: string;
  investment: string;
  equity: string;
  founder: string;
  shares: string;
  cash: string;
  burn: string;
  fee: string;
  fixed: string;
  target: string;
  reserve: string;
  revenue: string;
}
export const emptyDraft: Draft = {
  currency: "INR",
  notation: "indian",
  solveFor: "equity",
  basis: "pre",
  unit: "units",
  valuation: "",
  investment: "",
  equity: "",
  founder: "100",
  shares: "",
  cash: "",
  burn: "",
  fee: "0",
  fixed: "0",
  target: "18",
  reserve: "0",
  revenue: "",
};
export const exampleDraft: Draft = {
  ...emptyDraft,
  valuation: "50000000",
  investment: "10000000",
  founder: "60",
  shares: "1000000",
  cash: "2000000",
  burn: "1000000",
  fee: "2",
  revenue: "10000000",
};

export interface Assumption {
  key: string;
  label: string;
  value: string | null;
  kind: ValueKind;
  provenance: Provenance;
  note?: string;
}
export type NormalizedRound =
  | {
      solveFor: "equity";
      valuationBasis: Basis;
      valuation: string;
      investment: string;
    }
  | {
      solveFor: "investment";
      valuationBasis: Basis;
      valuation: string;
      equityFraction: string;
    }
  | {
      solveFor: "valuation";
      valuationBasis: Basis;
      investment: string;
      equityFraction: string;
    };
export interface NormalizedScenario {
  schemaVersion: "2";
  mode: "simple-priced-round";
  currency: Currency;
  round: NormalizedRound;
  assumptions: Record<string, string | null>;
}
export interface RoundResult {
  engineVersion: string;
  sections: Section[];
  inputs: Assumption[];
  normalized: NormalizedScenario | null;
  core: {
    pre: string;
    post: string;
    investment: string;
    equity: string;
  } | null;
  errors: Record<string, string>;
  canExport: boolean;
}
const labels: Record<string, string> = {
  valuation: "Entered equity valuation",
  investment: "Gross primary investment",
  equity: "Investor ownership",
  founder: "Founder ownership before",
  shares: "Existing fully diluted shares",
  cash: "Current cash",
  burn: "Monthly net burn",
  fee: "Financing fee",
  fixed: "Fixed transaction costs",
  target: "Target runway",
  reserve: "Reserve target",
  revenue: "Annual revenue (not ARR)",
};
const kinds: Record<string, ValueKind> = {
  valuation: "money",
  investment: "money",
  equity: "percent",
  founder: "percent",
  shares: "shares",
  cash: "money",
  burn: "money",
  fee: "percent",
  fixed: "money",
  target: "months",
  reserve: "money",
  revenue: "money",
};

export function calculateRound(draft: Draft): RoundResult {
  const errors: Record<string, string> = {};
  const inputs: Assumption[] = [];
  const values: Record<string, Decimal | null> = {};
  const normalizedAssumptions: Record<string, string | null> = {};
  function collect(key: string, parsed: ParseResult, required = false) {
    let provenance: Provenance = "entered";
    let note: string | undefined;
    if (parsed.kind === "error") {
      errors[key] = parsed.message;
      provenance = "invalid";
      note = parsed.message;
    }
    if (parsed.kind === "empty") {
      provenance = "missing";
      if (required) {
        errors[key] = "This known value is required.";
        note = errors[key];
      }
    }
    values[key] = parsed.kind === "ok" ? parsed.value : null;
    inputs.push({
      key,
      label: labels[key],
      value: values[key] ? str(values[key]!) : null,
      kind: kinds[key],
      provenance,
      note,
    });
  }
  if (draft.solveFor !== "valuation")
    collect(
      "valuation",
      parseAmount(draft.valuation, draft.unit, { label: "Valuation" }),
      true,
    );
  if (draft.solveFor !== "investment")
    collect(
      "investment",
      parseAmount(draft.investment, draft.unit, { label: "Investment" }),
      true,
    );
  if (draft.solveFor !== "equity")
    collect(
      "equity",
      parsePercent(draft.equity, { exclusive: true, label: "Investor equity" }),
      true,
    );
  collect(
    "founder",
    parsePercent(draft.founder, {
      allowZero: true,
      allowHundred: true,
      label: "Founder ownership",
    }),
  );
  collect(
    "shares",
    parseAmount(draft.shares, "units", {
      limit: LIMITS.shares,
      label: "Shares",
    }),
  );
  for (const key of ["cash", "burn", "fixed", "reserve", "revenue"] as const)
    collect(
      key,
      parseAmount(draft[key], draft.unit, {
        allowZero: true,
        label: labels[key],
      }),
    );
  collect(
    "fee",
    parsePercent(draft.fee, {
      allowZero: true,
      allowHundred: true,
      label: "Fee",
    }),
  );
  collect("target", parseMonths(draft.target));
  for (const key of [
    "founder",
    "shares",
    "cash",
    "burn",
    "fee",
    "fixed",
    "target",
    "reserve",
    "revenue",
  ])
    normalizedAssumptions[key] = values[key] == null ? null : str(values[key]!);
  const issue = (keys: string[]): FieldIssue[] =>
    keys
      .filter((k) => errors[k])
      .map((k) => ({ field: k, message: errors[k], severity: "error" }));
  const coreKeys = ["valuation", "investment", "equity"].filter(
    (k) => k !== draft.solveFor,
  );
  const coreSection: Section = {
    id: "core",
    title: "Priced round",
    status: coreKeys.some((k) => errors[k] && values[k] == null)
      ? coreKeys.some(
          (k) => inputs.find((i) => i.key === k)?.provenance === "invalid",
        )
        ? "invalid"
        : "incomplete"
      : "valid",
    values: [],
    issues: issue(coreKeys),
    trace: [],
  };
  let core: RoundResult["core"] = null;
  let normalized: NormalizedScenario | null = null;
  if (coreSection.status === "valid") {
    let pre: Decimal, post: Decimal, investment: Decimal, equity: Decimal;
    if (draft.solveFor === "equity") {
      investment = values.investment!;
      if (draft.basis === "pre") {
        pre = values.valuation!;
        post = pre.add(investment);
      } else {
        post = values.valuation!;
        pre = post.sub(investment);
      }
      equity = investment.div(post);
      coreSection.trace.push({
        label: "Investor ownership",
        formula: "e = I / M",
      });
    } else if (draft.solveFor === "investment") {
      equity = values.equity!;
      if (draft.basis === "pre") {
        pre = values.valuation!;
        investment = pre.mul(equity).div(ONE.sub(equity));
        post = pre.add(investment);
      } else {
        post = values.valuation!;
        investment = post.mul(equity);
        pre = post.sub(investment);
      }
      coreSection.trace.push({
        label: "Primary investment",
        formula: draft.basis === "pre" ? "I = P × e / (1 − e)" : "I = M × e",
      });
    } else {
      investment = values.investment!;
      equity = values.equity!;
      post = investment.div(equity);
      pre = post.sub(investment);
      coreSection.trace.push({
        label: "Equity valuation",
        formula: "M = I / e; P = M − I",
      });
    }
    if (pre.lte(0)) {
      errors.valuation = "Post-money valuation must exceed primary investment.";
      coreSection.status = "invalid";
      coreSection.issues = issue(["valuation"]);
    } else if ([pre, post, investment].some((v) => v.gt(LIMITS.money))) {
      errors.valuation = "Calculated amount exceeds the supported 10¹⁵ limit.";
      coreSection.status = "invalid";
      coreSection.issues = issue(["valuation"]);
    } else {
      core = {
        pre: str(pre),
        post: str(post),
        investment: str(investment),
        equity: str(equity),
      };
      coreSection.values = [
        {
          key: "pre",
          label: "Pre-money equity valuation",
          value: core.pre,
          kind: "money",
        },
        {
          key: "post",
          label: "Post-money equity valuation",
          value: core.post,
          kind: "money",
        },
        {
          key: "investment",
          label: "Gross primary investment",
          value: core.investment,
          kind: "money",
        },
        {
          key: "equity",
          label: "New investor ownership",
          value: core.equity,
          kind: "percent",
        },
      ];
      coreSection.trace.push({
        label: "Valuation bridge",
        formula: "M = P + I",
      });
      const base = { valuationBasis: draft.basis };
      const round: NormalizedRound =
        draft.solveFor === "equity"
          ? {
              ...base,
              solveFor: "equity",
              valuation: str(values.valuation!),
              investment: core.investment,
            }
          : draft.solveFor === "investment"
            ? {
                ...base,
                solveFor: "investment",
                valuation: str(values.valuation!),
                equityFraction: core.equity,
              }
            : {
                ...base,
                solveFor: "valuation",
                investment: core.investment,
                equityFraction: core.equity,
              };
      normalized = {
        schemaVersion: "2",
        mode: "simple-priced-round",
        currency: draft.currency,
        round,
        assumptions: normalizedAssumptions,
      };
    }
  }
  function section(id: string, title: string, keys: string[]): Section {
    const issues = issue(keys);
    return {
      id,
      title,
      status: issues.length
        ? "invalid"
        : !core || keys.some((k) => values[k] == null)
          ? "incomplete"
          : "valid",
      values: [],
      issues,
      trace: [],
    };
  }
  const ownership = section("ownership", "Ownership & dilution", ["founder"]);
  if (core && ownership.status === "valid") {
    const f = values.founder!,
      e = D(core.equity),
      after = f.mul(ONE.sub(e));
    ownership.values = [
      {
        key: "founderBefore",
        label: "Founder before",
        value: str(f),
        kind: "percent",
      },
      {
        key: "founderAfter",
        label: "Founder after",
        value: str(after),
        kind: "percent",
      },
      {
        key: "otherAfter",
        label: "Other existing owners after",
        value: str(ONE.sub(f).mul(ONE.sub(e))),
        kind: "percent",
      },
      {
        key: "loss",
        label: "Ownership lost",
        value: str(f.sub(after).mul(HUNDRED)),
        kind: "pp",
      },
      {
        key: "relativeDilution",
        label: "Relative dilution",
        value: f.isZero() ? null : core.equity,
        kind: "percent",
        note: f.isZero()
          ? "Undefined when starting ownership is zero"
          : undefined,
      },
    ];
    ownership.trace = [
      { label: "Retention", formula: "f_after = f × (1 − e)" },
      {
        label: "Percentage points vs. dilution",
        formula:
          "loss_pp = 100 × (f − f_after); relative dilution = (f − f_after) / f",
      },
    ];
  }
  const shares = section("shares", "Share issuance", ["shares"]);
  if (core && shares.status === "valid") {
    const price = D(core.pre).div(values.shares!),
      added = D(core.investment).div(price),
      total = values.shares!.add(added);
    if (total.gt(LIMITS.shares)) {
      errors.shares = "Resulting share count exceeds 10¹⁵.";
      shares.status = "invalid";
      shares.issues = issue(["shares"]);
    } else
      shares.values = [
        {
          key: "price",
          label: "Price per share",
          value: str(price),
          kind: "price",
        },
        {
          key: "newShares",
          label: "New investor shares",
          value: str(added),
          kind: "shares",
        },
        {
          key: "totalShares",
          label: "Total fully diluted shares",
          value: str(total),
          kind: "shares",
        },
      ];
    shares.trace = [
      {
        label: "Illustrative share issuance",
        formula:
          "price = P / S; new shares = I / price; total = S + new shares",
      },
    ];
  }
  const fees = section("fees", "Fees & usable cash", ["fee", "fixed"]);
  let net: Decimal | null = null;
  if (core && fees.status === "valid") {
    const deduction = D(core.investment).mul(values.fee!).add(values.fixed!);
    if (deduction.gt(core.investment)) {
      errors.fixed =
        "Combined fees and fixed costs cannot exceed gross primary proceeds.";
      fees.status = "invalid";
      fees.issues = issue(["fixed"]);
    } else {
      net = D(core.investment).sub(deduction);
      fees.values = [
        {
          key: "deductions",
          label: "Total financing costs",
          value: str(deduction),
          kind: "money",
        },
        {
          key: "net",
          label: "Net company proceeds",
          value: str(net),
          kind: "money",
        },
      ];
    }
    fees.trace = [
      {
        label: "Company cash received",
        formula: "Net proceeds = I × (1 − t) − F",
      },
    ];
  }
  const runway = section("runway", "Runway & cash gap", [
    "cash",
    "burn",
    "target",
    "reserve",
    "fee",
    "fixed",
  ]);
  if (fees.status === "invalid") {
    runway.status = "invalid";
    runway.issues = fees.issues;
  }
  if (core && net != null && runway.status === "valid") {
    const cash = values.cash!,
      burn = values.burn!,
      after = cash.add(net),
      need = values.target!.mul(burn).add(values.reserve!),
      gap = max(ZERO, need.sub(after));
    const gross = (needed: Decimal) =>
      needed.lte(0)
        ? ZERO
        : values.fee!.eq(1)
          ? null
          : needed.add(values.fixed!).div(ONE.sub(values.fee!));
    const beforeGross = gross(max(ZERO, need.sub(cash))),
      additional = gross(gap);
    runway.values = [
      {
        key: "cashAfter",
        label: "Cash after the raise",
        value: str(after),
        kind: "money",
      },
      {
        key: "runwayBefore",
        label: "Runway before",
        value: burn.isZero() ? null : str(cash.div(burn)),
        kind: "months",
        note: burn.isZero() ? "No depletion at current burn" : undefined,
      },
      {
        key: "runwayAfter",
        label: "Runway after",
        value: burn.isZero() ? null : str(after.div(burn)),
        kind: "months",
        note: burn.isZero() ? "No depletion at current burn" : undefined,
      },
      {
        key: "gap",
        label: "Remaining target cash gap",
        value: str(gap),
        kind: "money",
      },
      {
        key: "grossRequired",
        label: "Gross raise needed before financing",
        value: beforeGross == null ? null : str(beforeGross),
        kind: "money",
        note: beforeGross == null ? "Impossible with a 100% fee" : undefined,
      },
      {
        key: "additional",
        label: "Additional gross financing after this round",
        value: additional == null ? null : str(additional),
        kind: "money",
        note:
          additional == null
            ? "Impossible with a 100% fee"
            : "Assumes a new financing with the same fees",
      },
    ];
    runway.trace = [
      {
        label: "Flat-burn estimate",
        formula: "Runway = cash / monthly net burn",
      },
      {
        label: "Target cash gap",
        formula: "gap = max(0, target × burn + reserve − cash_after)",
      },
      {
        label: "Fee gross-up (only when financing is needed)",
        formula: "gross = (cash needed + fixed fees) / (1 − fee fraction)",
      },
    ];
  }
  const revenue = section("revenue", "Revenue context", ["revenue"]);
  if (core && revenue.status === "valid")
    revenue.values = [
      {
        key: "revenueMultiple",
        label: "Pre-money equity valuation / annual revenue",
        value: values.revenue!.isZero()
          ? null
          : str(D(core.pre).div(values.revenue!)),
        kind: "multiple",
        note: values.revenue!.isZero()
          ? "Unavailable at zero revenue; this is not EV/revenue"
          : "Equity valuation, not enterprise value",
      },
    ];
  revenue.trace = [
    {
      label: "Revenue multiple",
      formula: "P / annual revenue (positive denominator required)",
    },
  ];
  const sections = [coreSection, ownership, shares, fees, runway, revenue];
  for (const s of sections)
    if (s.status === "incomplete")
      s.summary =
        "Not provided — enter the required assumptions to enable this section.";
  return {
    engineVersion: ENGINE_VERSION,
    sections,
    inputs,
    normalized,
    core,
    errors,
    canExport: !!core && !sections.some((s) => s.status === "invalid"),
  };
}
