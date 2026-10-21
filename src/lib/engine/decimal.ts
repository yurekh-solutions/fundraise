import DecimalBase from "decimal.js";

/**
 * Pinned arithmetic configuration. Changing precision or rounding mode is an
 * engine-semantics change and MUST bump ENGINE_VERSION.
 */
export const Decimal = DecimalBase.clone({
  precision: 40,
  rounding: DecimalBase.ROUND_HALF_EVEN,
  toExpNeg: -60,
  toExpPos: 60,
});
export type Decimal = DecimalBase;

export const ENGINE_VERSION = "1.0.0";
export const SCHEMA_VERSION = "2";

/** Proposed product limits (not financial truths). Enforced, never clamped. */
export const LIMITS = {
  money: new Decimal("1e15"),
  shares: new Decimal("1e15"),
  forecastMonths: 120,
  rounds: 20,
  stakeholders: 100,
  sensitivityPoints: 11,
  nameLength: 120,
} as const;

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);
export const HUNDRED = new Decimal(100);

export const D = (v: string | number | Decimal) => new Decimal(v);

/** Canonical decimal string (no exponent). */
export const str = (d: Decimal) => d.toFixed();

export const max = (a: Decimal, b: Decimal) => (a.gt(b) ? a : b);
export const min = (a: Decimal, b: Decimal) => (a.lt(b) ? a : b);

/** Tolerance used for repeating fractions in reconciliation checks. */
export const TOLERANCE = new Decimal("1e-10");
