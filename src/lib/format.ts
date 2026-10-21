import { D, Decimal } from "./engine/decimal";
import { Currency, Notation, ValueKind } from "./engine/types";
export const SYMBOL: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
};
/** Group decimal strings without converting financial values to binary floats. */
export function decimalFormat(
  value: string,
  dp = 2,
  notation: Notation = "international",
) {
  const fixed = D(value).toDecimalPlaces(dp).toFixed(dp),
    [whole, fraction] = fixed.split(".");
  const negative = whole.startsWith("-"),
    digits = negative ? whole.slice(1) : whole;
  let grouped: string;
  if (notation === "indian" && digits.length > 3) {
    const last = digits.slice(-3);
    grouped =
      digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last;
  } else grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (negative ? "−" : "") + grouped + (fraction ? "." + fraction : "");
}
export function format(
  value: string | null,
  kind: ValueKind,
  currency: Currency = "INR",
  notation: Notation = "international",
  note?: string,
): string {
  if (value == null) return note || "Not provided";
  switch (kind) {
    case "money":
      return `${SYMBOL[currency]}${decimalFormat(value, 2, notation)}`;
    case "price":
      return `${SYMBOL[currency]}${decimalFormat(value, 6, notation)} / share`;
    case "percent":
      return `${decimalFormat(D(value).mul(100).toFixed(), 4)}%`;
    case "pp":
      return `${decimalFormat(value, 4)} pp`;
    case "shares":
      return (
        decimalFormat(value, 6, notation)
          .replace(/(\.\d*?)0+$/, "$1")
          .replace(/\.$/, "") + " shares"
      );
    case "months":
      return `${decimalFormat(value, 2)} months`;
    case "multiple":
      return `${decimalFormat(value, 2)}×`;
    case "ratio":
      return decimalFormat(value, 4);
    default:
      return value;
  }
}
export function shortMoney(
  value: string,
  currency: Currency = "INR",
  notation: Notation = "international",
) {
  const d = D(value),
    abs = d.abs();
  const units: [Decimal, string][] =
    notation === "indian"
      ? [
          [D("1e7"), "Cr"],
          [D("1e5"), "L"],
          [D("1e3"), "K"],
        ]
      : [
          [D("1e9"), "B"],
          [D("1e6"), "M"],
          [D("1e3"), "K"],
        ];
  const match = units.find(([n]) => abs.gte(n));
  return (
    SYMBOL[currency] +
    (match
      ? decimalFormat(d.div(match[0]).toFixed(), 2) + match[1]
      : decimalFormat(value, 2))
  );
}
