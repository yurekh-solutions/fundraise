import {
  D,
  Decimal,
  HUNDRED,
  LIMITS,
  ONE,
  TOLERANCE,
  ZERO,
  max,
  str,
} from "./decimal";
import {
  parseAmount,
  parseInteger,
  parseNumber,
  parsePercent,
  validateName,
} from "./parse";

export interface Holding {
  id: string;
  name: string;
  type: "founder" | "holder" | "award" | "pool";
  shares: string;
}
export interface Investor {
  id: string;
  name: string;
  cash: string;
}
export interface PricedEvent {
  id: string;
  name: string;
  date: string;
  valuation: string;
  investors: Investor[];
  poolTarget: string;
  poolTiming: "none" | "pre" | "post";
}
export interface Transfer {
  id: string;
  seller: string;
  buyer: string;
  shares: string;
  price: string;
  fees: string;
}
export interface LedgerInput {
  holdings: Holding[];
  transfers: Transfer[];
  rounds: PricedEvent[];
}
export interface LedgerRow extends Holding {
  fraction: string;
  basicFraction: string | null;
}
export interface RoundSnapshot {
  id: string;
  name: string;
  date: string;
  price: string;
  investment: string;
  poolAdded: string;
  total: string;
  rows: LedgerRow[];
  investorFraction: string;
}
export interface LedgerResult {
  valid: boolean;
  errors: string[];
  starting: LedgerRow[];
  snapshots: RoundSnapshot[];
  rows: LedgerRow[];
  secondaryTotal: string;
  secondaryNet: string;
  total: string;
}

function amount(text: string, name: string, zero = false): Decimal {
  const p = parseAmount(text, "units", { allowZero: zero, label: name });
  if (p.kind !== "ok")
    throw new Error(p.kind === "error" ? p.message : `${name} is required.`);
  return p.value;
}
function percent(text: string, name: string, allow100 = false): Decimal {
  const p = parsePercent(text, {
    allowZero: true,
    allowHundred: allow100,
    label: name,
  });
  if (p.kind !== "ok")
    throw new Error(p.kind === "error" ? p.message : `${name} is required.`);
  return p.value;
}
function name(value: string) {
  const error = validateName(value);
  if (error) throw new Error(error);
}
function ledgerRows(holdings: Holding[]): LedgerRow[] {
  const total = holdings.reduce((s, h) => s.add(h.shares), ZERO);
  const issued = holdings
    .filter((h) => h.type !== "pool" && h.type !== "award")
    .reduce((s, h) => s.add(h.shares), ZERO);
  if (total.lte(0) || total.gt(LIMITS.shares))
    throw new Error(
      "Total fully diluted shares must be positive and at most 10¹⁵.",
    );
  return holdings.map((h) => ({
    ...h,
    fraction: str(D(h.shares).div(total)),
    basicFraction:
      h.type === "pool" || h.type === "award" || issued.isZero()
        ? null
        : str(D(h.shares).div(issued)),
  }));
}

export function poolTopUp(
  S: Decimal,
  U: Decimal,
  P: Decimal,
  I: Decimal,
  q: Decimal,
  timing: "pre" | "post",
): Decimal {
  if (
    S.lte(0) ||
    U.lt(0) ||
    U.gt(S) ||
    P.lte(0) ||
    I.lt(0) ||
    q.lt(0) ||
    q.gte(1)
  )
    throw new Error("Invalid pool solver domain.");
  const k = ONE.add(I.div(P));
  const T = S.mul(k);
  if (U.div(T).gte(q)) return ZERO;
  const denominator = timing === "pre" ? ONE.sub(q.mul(k)) : ONE.sub(q);
  if (denominator.lte(0))
    throw new Error(
      "Pool target is impossible under this pre-money agreement (1 − q × k must be positive).",
    );
  return max(
    ZERO,
    q
      .mul(timing === "pre" ? k.mul(S) : T)
      .sub(U)
      .div(denominator),
  );
}

export function calculateLedger(input: LedgerInput): LedgerResult {
  const result: LedgerResult = {
    valid: false,
    errors: [],
    starting: [],
    snapshots: [],
    rows: [],
    secondaryTotal: "0",
    secondaryNet: "0",
    total: "0",
  };
  try {
    if (!input.holdings.length || input.holdings.length > LIMITS.stakeholders)
      throw new Error("Enter 1–100 starting holdings.");
    if (input.rounds.length > LIMITS.rounds)
      throw new Error("A scenario supports at most 20 rounds.");
    let holdings: Holding[] = input.holdings.map((h) => {
      name(h.name);
      return { ...h, shares: str(amount(h.shares, `${h.name}: shares`, true)) };
    });
    if (new Set(holdings.map((h) => h.id)).size !== holdings.length)
      throw new Error("Holding IDs must be unique.");
    result.starting = ledgerRows(holdings);
    let secondary = ZERO,
      secondaryNet = ZERO;
    for (const t of input.transfers) {
      const seller = holdings.find((h) => h.id === t.seller),
        buyer = holdings.find((h) => h.id === t.buyer);
      if (
        !seller ||
        !buyer ||
        seller === buyer ||
        [seller.type, buyer.type].some((t) => t === "award" || t === "pool")
      )
        throw new Error(
          "A secondary transfer requires distinct existing issued-share holders.",
        );
      const qty = amount(t.shares, "Transfer shares"),
        price = amount(t.price, "Secondary price", true),
        fees = amount(t.fees, "Secondary fees", true);
      if (qty.gt(seller.shares))
        throw new Error("Secondary shares exceed the seller’s holding.");
      const proceeds = qty.mul(price);
      if (fees.gt(proceeds))
        throw new Error("Secondary fees cannot exceed seller proceeds.");
      seller.shares = str(D(seller.shares).sub(qty));
      buyer.shares = str(D(buyer.shares).add(qty));
      secondary = secondary.add(proceeds);
      secondaryNet = secondaryNet.add(proceeds.sub(fees));
    }
    result.secondaryTotal = str(secondary);
    result.secondaryNet = str(secondaryNet);
    const roundIds = new Set<string>();
    for (const round of input.rounds) {
      name(round.name);
      if (roundIds.has(round.id)) throw new Error("Round IDs must be unique.");
      roundIds.add(round.id);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(round.date) ||
        new Date(round.date + "T00:00:00Z").toISOString().slice(0, 10) !==
          round.date
      )
        throw new Error("Each round requires a valid ISO date.");
      if (!round.investors.length || round.investors.length > 100)
        throw new Error("Each round needs 1–100 investors.");
      const P = amount(round.valuation, `${round.name}: pre-money valuation`);
      const investors = round.investors.map((i) => {
        name(i.name);
        if (holdings.some((h) => h.id === i.id))
          throw new Error("Investor IDs must be unique across ledger entries.");
        return { ...i, value: amount(i.cash, `${i.name}: investment`) };
      });
      if (new Set(investors.map((i) => i.id)).size !== investors.length)
        throw new Error("Duplicate investor IDs.");
      const I = investors.reduce((s, i) => s.add(i.value), ZERO);
      if (P.add(I).gt(LIMITS.money))
        throw new Error("Round post-money exceeds 10¹⁵.");
      const S = holdings.reduce((s, h) => s.add(h.shares), ZERO),
        U = holdings
          .filter((h) => h.type === "pool")
          .reduce((s, h) => s.add(h.shares), ZERO);
      const q = percent(round.poolTarget, "Pool target");
      let x = ZERO;
      if (round.poolTiming !== "none")
        x = poolTopUp(S, U, P, I, q, round.poolTiming);
      const price = P.div(round.poolTiming === "pre" ? S.add(x) : S);
      if (x.gt(0)) {
        const pool = holdings.find((h) => h.type === "pool");
        if (pool) pool.shares = str(D(pool.shares).add(x));
        else
          holdings.push({
            id: `pool-${round.id}`,
            name: "Unallocated option pool",
            type: "pool",
            shares: str(x),
          });
      }
      const newRows: Holding[] = investors.map((i) => ({
        id: i.id,
        name: i.name,
        type: "holder",
        shares: str(i.value.div(price)),
      }));
      holdings = [...holdings, ...newRows];
      const rows = ledgerRows(holdings),
        total = holdings.reduce((s, h) => s.add(h.shares), ZERO);
      if (
        rows
          .reduce((s, r) => s.add(r.fraction), ZERO)
          .sub(ONE)
          .abs()
          .gt(TOLERANCE)
      )
        throw new Error("Share ledger failed ownership reconciliation.");
      result.snapshots.push({
        id: round.id,
        name: round.name,
        date: round.date,
        price: str(price),
        investment: str(I),
        poolAdded: str(x),
        total: str(total),
        rows,
        investorFraction: str(
          newRows.reduce((s, r) => s.add(r.shares), ZERO).div(total),
        ),
      });
    }
    result.rows = ledgerRows(holdings);
    result.total = str(holdings.reduce((s, h) => s.add(h.shares), ZERO));
    result.valid = true;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "Invalid ledger.");
    result.rows = [];
    result.snapshots = [];
  }
  return result;
}

export interface Hire {
  id: string;
  name: string;
  start: string;
  count: string;
  salary: string;
}
export interface Funding {
  id: string;
  month: string;
  gross: string;
  fee: string;
  fixed: string;
}
export interface OneOff {
  id: string;
  month: string;
  amount: string;
  category: "capex" | "operations";
}
export interface MonthlyOverride {
  month: string;
  revenue: string;
  cogs: string;
  opex: string;
}
export interface ForecastInput {
  months: string;
  opening: string;
  reserve: string;
  revenue: string;
  growth: string;
  cogs: string;
  opex: string;
  expenseGrowth: string;
  delay: string;
  case: "base" | "upside" | "downside";
  upsideRevenue: string;
  upsideExpense: string;
  downsideRevenue: string;
  downsideExpense: string;
  hires: Hire[];
  funding: Funding[];
  costs: OneOff[];
  overrides: MonthlyOverride[];
  allocations: Record<
    "hiring" | "product" | "marketing" | "operations" | "capex" | "reserve",
    string
  >;
}
export const emptyForecast: ForecastInput = {
  months: "24",
  opening: "",
  reserve: "0",
  revenue: "",
  growth: "0",
  cogs: "0",
  opex: "",
  expenseGrowth: "0",
  delay: "0",
  case: "base",
  upsideRevenue: "20",
  upsideExpense: "0",
  downsideRevenue: "-20",
  downsideExpense: "20",
  hires: [],
  funding: [],
  costs: [],
  overrides: [],
  allocations: {
    hiring: "0",
    product: "0",
    marketing: "0",
    operations: "0",
    capex: "0",
    reserve: "0",
  },
};
export interface MonthRow {
  month: number;
  opening: string;
  revenue: string;
  receipts: string;
  outflows: string;
  capex: string;
  gross: string;
  fees: string;
  burn: string;
  closing: string;
}
export interface ForecastResult {
  valid: boolean;
  errors: string[];
  rows: MonthRow[];
  belowZero: number | null;
  belowReserve: number | null;
  netFunding: string;
  unallocated: string;
  openingShortfall: boolean;
}
function integer(
  text: string,
  label: string,
  min: number,
  max: number,
): number {
  const p = parseInteger(text, min, max, label);
  if (p.kind !== "ok")
    throw new Error(p.kind === "error" ? p.message : `${label} is required.`);
  return p.value.toNumber();
}
function signedPercent(text: string, label: string): Decimal {
  const p = parseNumber(text);
  if (p.kind !== "ok" || p.value.lte(-100) || p.value.gt(1000))
    throw new Error(`${label} must be greater than −100% and at most 1000%.`);
  return p.value.div(100);
}
export function calculateForecast(input: ForecastInput): ForecastResult {
  const result: ForecastResult = {
    valid: false,
    errors: [],
    rows: [],
    belowZero: null,
    belowReserve: null,
    netFunding: "0",
    unallocated: "0",
    openingShortfall: false,
  };
  try {
    const n = integer(input.months, "Horizon", 1, 120),
      delay = integer(input.delay, "Collection delay", 0, 120);
    let cash = amount(input.opening, "Opening cash", true);
    const reserve = amount(input.reserve, "Reserve", true),
      initialRevenue = amount(input.revenue, "Monthly revenue", true),
      initialOpex = amount(input.opex, "Monthly operating expenses", true);
    const growth = signedPercent(input.growth, "Revenue growth"),
      expenseGrowth = signedPercent(input.expenseGrowth, "Expense growth"),
      cogs = percent(input.cogs, "COGS as percentage of revenue", true);
    const uR = signedPercent(input.upsideRevenue, "Upside revenue change"),
      uE = signedPercent(input.upsideExpense, "Upside expense change"),
      dR = signedPercent(input.downsideRevenue, "Downside revenue change"),
      dE = signedPercent(input.downsideExpense, "Downside expense change");
    const rDriver =
        input.case === "base"
          ? ONE
          : ONE.add(input.case === "upside" ? uR : dR),
      eDriver =
        input.case === "base"
          ? ONE
          : ONE.add(input.case === "upside" ? uE : dE);
    const hires = input.hires.map((h) => {
      name(h.name);
      return {
        start: integer(h.start, "Hire start month", 1, n),
        count: integer(h.count, "Headcount", 1, 10000),
        salary: amount(h.salary, "Loaded monthly salary", true),
      };
    });
    const funding = input.funding.map((f) => {
      const gross = amount(f.gross, "Funding", true),
        fees = gross
          .mul(percent(f.fee, "Funding fee", true))
          .add(amount(f.fixed, "Fixed funding costs", true));
      if (fees.gt(gross)) throw new Error("Funding fees exceed primary cash.");
      return { month: integer(f.month, "Funding month", 1, n), gross, fees };
    });
    const costs = input.costs.map((c) => ({
      month: integer(c.month, "Cost month", 1, n),
      value: amount(c.amount, "One-off cost", true),
      category: c.category,
    }));
    const overrides = input.overrides.map((o) => ({
      month: integer(o.month, "Override month", 1, n),
      revenue: amount(o.revenue, "Override revenue", true),
      cogs: amount(o.cogs, "Override COGS", true),
      opex: amount(o.opex, "Override operating expenses", true),
    }));
    if (new Set(overrides.map((o) => o.month)).size !== overrides.length)
      throw new Error("Only one override per month is supported.");
    const net = funding.reduce((s, f) => s.add(f.gross).sub(f.fees), ZERO),
      allocated = Object.values(input.allocations).reduce(
        (s, v) => s.add(amount(v, "Allocation", true)),
        ZERO,
      );
    if (allocated.gt(net))
      throw new Error(
        "Use-of-funds allocations cannot exceed net financing proceeds.",
      );
    result.netFunding = str(net);
    result.unallocated = str(net.sub(allocated));
    result.openingShortfall = cash.lt(reserve);
    const revenues: Decimal[] = [];
    for (let m = 1; m <= n; m++) {
      const override = overrides.find((o) => o.month === m);
      const revenue = (
        override?.revenue ?? initialRevenue.mul(ONE.add(growth).pow(m - 1))
      ).mul(rDriver);
      revenues.push(revenue);
      const receipts = m > delay ? revenues[m - delay - 1] : ZERO;
      const payroll = hires
        .filter((h) => h.start <= m)
        .reduce((s, h) => s.add(h.salary.mul(h.count)), ZERO)
        .mul(eDriver);
      const operations = (
        override?.opex ?? initialOpex.mul(ONE.add(expenseGrowth).pow(m - 1))
      ).mul(eDriver);
      const outflows = operations
        .add(payroll)
        .add(override?.cogs ?? revenue.mul(cogs))
        .add(
          costs
            .filter((c) => c.month === m && c.category === "operations")
            .reduce((s, c) => s.add(c.value), ZERO),
        );
      const capex = costs
        .filter((c) => c.month === m && c.category === "capex")
        .reduce((s, c) => s.add(c.value), ZERO);
      const gross = funding
          .filter((f) => f.month === m)
          .reduce((s, f) => s.add(f.gross), ZERO),
        fees = funding
          .filter((f) => f.month === m)
          .reduce((s, f) => s.add(f.fees), ZERO);
      const closing = cash
        .add(receipts)
        .add(gross)
        .sub(outflows)
        .sub(capex)
        .sub(fees);
      if ([revenue, outflows, closing.abs()].some((v) => v.gt(LIMITS.money)))
        throw new Error(`Month ${m} exceeds the supported 10¹⁵ amount limit.`);
      if (closing.lt(0) && result.belowZero == null) result.belowZero = m;
      if (closing.lt(reserve) && result.belowReserve == null)
        result.belowReserve = m;
      result.rows.push({
        month: m,
        opening: str(cash),
        revenue: str(revenue),
        receipts: str(receipts),
        outflows: str(outflows),
        capex: str(capex),
        gross: str(gross),
        fees: str(fees),
        burn: str(outflows.sub(receipts)),
        closing: str(closing),
      });
      cash = closing;
    }
    result.valid = true;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : "Invalid forecast.");
    result.rows = [];
  }
  return result;
}
export interface ReturnsInput {
  invested: string;
  ownership: string;
  years: string;
  exits: string[];
}
export const emptyReturns: ReturnsInput = {
  invested: "",
  ownership: "",
  years: "5",
  exits: [""],
};
export function calculateReturns(input: ReturnsInput) {
  try {
    const invested = amount(input.invested, "Invested cash"),
      e = percent(input.ownership, "Investor ownership", true),
      years = amount(input.years, "Holding period");
    if (years.gt(120) || input.exits.length < 1 || input.exits.length > 20)
      throw new Error(
        "Holding period is limited to 120 years and 1–20 exit values.",
      );
    const rows = input.exits.map((exit) => {
      const Dv = amount(exit, "Distributable equity proceeds", true),
        payout = Dv.mul(e),
        moic = payout.div(invested),
        annualized = moic.pow(ONE.div(years)).sub(ONE);
      return {
        exit: str(Dv),
        proceeds: str(payout),
        moic: str(moic),
        annualized: str(annualized),
      };
    });
    return { valid: true, errors: [] as string[], rows };
  } catch (e) {
    return {
      valid: false,
      errors: [e instanceof Error ? e.message : "Invalid returns."],
      rows: [],
    };
  }
}
export interface SensitivityInput {
  minVal: string;
  maxVal: string;
  minRaise: string;
  maxRaise: string;
  points: string;
  founder: string;
}
export const emptySensitivity: SensitivityInput = {
  minVal: "40000000",
  maxVal: "60000000",
  minRaise: "5000000",
  maxRaise: "15000000",
  points: "5",
  founder: "100",
};
export function calculateSensitivity(input: SensitivityInput) {
  try {
    const lowV = amount(input.minVal, "Minimum valuation"),
      highV = amount(input.maxVal, "Maximum valuation"),
      lowI = amount(input.minRaise, "Minimum investment"),
      highI = amount(input.maxRaise, "Maximum investment"),
      n = integer(input.points, "Points per axis", 2, 11),
      f = percent(input.founder, "Starting founder ownership", true);
    if (highV.lt(lowV) || highI.lt(lowI))
      throw new Error("Range maximum must be at least the minimum.");
    const vals = Array.from({ length: n }, (_, j) =>
      lowV.add(
        highV
          .sub(lowV)
          .mul(j)
          .div(n - 1),
      ),
    );
    const raises = Array.from({ length: n }, (_, j) =>
      lowI.add(
        highI
          .sub(lowI)
          .mul(j)
          .div(n - 1),
      ),
    );
    const rows = raises.map((I) => ({
      investment: str(I),
      cells: vals.map((P) =>
        P.add(I).gt(LIMITS.money)
          ? null
          : {
              equity: str(I.div(P.add(I))),
              founder: str(f.mul(P.div(P.add(I)))),
            },
      ),
    }));
    return {
      valid: true,
      errors: [] as string[],
      valuations: vals.map(str),
      rows,
    };
  } catch (e) {
    return {
      valid: false,
      errors: [e instanceof Error ? e.message : "Invalid sensitivity."],
      valuations: [],
      rows: [],
    };
  }
}
