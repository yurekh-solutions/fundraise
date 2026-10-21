/** Shared engine contracts. All numeric values crossing module boundaries are decimal strings. */

export type Currency = "INR" | "USD" | "GBP" | "EUR";
export const CURRENCIES: Currency[] = ["INR", "USD", "GBP", "EUR"];

export type Notation = "indian" | "international";

export type SectionStatus = "valid" | "incomplete" | "invalid" | "unsupported";

export type Provenance =
  "entered" | "defaulted" | "derived" | "missing" | "invalid";

export interface FieldIssue {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export type ValueKind =
  | "money"
  | "percent"
  | "shares"
  | "price"
  | "months"
  | "multiple"
  | "ratio"
  | "text"
  | "pp";

export interface ResultValue {
  key: string;
  label: string;
  /** Decimal string, or null when unavailable. */
  value: string | null;
  kind: ValueKind;
  /** Plain-language reason shown instead of a value when null. */
  note?: string;
}

export interface FormulaStep {
  label: string;
  formula: string;
}

export interface Section {
  id: string;
  title: string;
  status: SectionStatus;
  values: ResultValue[];
  issues: FieldIssue[];
  trace: FormulaStep[];
  /** Short explanation when not valid. */
  summary?: string;
}

export const statusRank: Record<SectionStatus, number> = {
  valid: 0,
  incomplete: 1,
  unsupported: 2,
  invalid: 3,
};
