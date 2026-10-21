import { D, ENGINE_VERSION } from "./engine/decimal";
import { calculateRound, RoundResult } from "./engine/round";
import {
  calculateForecast,
  calculateLedger,
  calculateReturns,
  calculateSensitivity,
} from "./engine/planning";
import { format } from "./format";
import { Project } from "./workspace";
import { Currency, ValueKind } from "./engine/types";
import { parseNumber } from "./engine/parse";
const canonical = (text: string) => {
  const p = parseNumber(text);
  return p.kind === "ok" ? p.value.toFixed() : null;
};

export interface ReportRow {
  label: string;
  value: string | null;
  display: string;
  unit: string;
  provenance: string;
  status: string;
  note: string;
}
export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
}
export interface ReportSection {
  id: string;
  title: string;
  status: string;
  rows: ReportRow[];
  tables: ReportTable[];
  formulas: string[];
}
export interface Report {
  name: string;
  company: string;
  revision: string;
  createdAt: string;
  currency: Currency;
  engineVersion: string;
  sections: ReportSection[];
  warnings: string[];
  blocked: boolean;
  normalized: RoundResult["normalized"];
}
const unit = (kind: ValueKind, currency: Currency) =>
  kind === "money"
    ? `${currency} major units`
    : kind === "price"
      ? `${currency}/share`
      : kind === "percent"
        ? "fraction (displayed as %)"
        : kind === "pp"
          ? "percentage points"
          : kind;
export const DISCLAIMER =
  "Planning estimates only. Not legal, tax or investment advice. Fractional shares are illustrative, not issuance instructions. SAFE, convertible-note and preferred terms are not supported. No currency conversion is performed.";

export function buildReport(
  project: Project,
  name = "Untitled scenario",
  revision = "Unsaved draft",
  createdAt = new Date().toISOString(),
  included?: string[],
): Report {
  const result = calculateRound(project.draft),
    currency = project.draft.currency;
  const fmt = (value: string | null, kind: ValueKind, note?: string) =>
    format(value, kind, currency, project.draft.notation, note);
  const sections: ReportSection[] = [
    {
      id: "inputs",
      title: "Entered assumptions",
      status: result.canExport ? "valid" : "invalid",
      rows: result.inputs.map((i) => ({
        label: i.label,
        value: i.value,
        display: fmt(i.value, i.kind, i.note),
        unit: unit(i.kind, currency),
        provenance: i.provenance,
        status:
          i.provenance === "invalid"
            ? "invalid"
            : i.provenance === "missing"
              ? "incomplete"
              : "valid",
        note: i.note ?? "",
      })),
      tables: [],
      formulas: [],
    },
  ];
  for (const s of result.sections)
    sections.push({
      id: s.id,
      title: s.title,
      status: s.status,
      rows: s.values.map((v) => ({
        label: v.label,
        value: v.value,
        display: fmt(v.value, v.kind, v.note),
        unit: unit(v.kind, currency),
        provenance: "derived",
        status: v.value == null ? "unavailable" : "valid",
        note: v.note ?? "",
      })),
      tables: [],
      formulas: s.trace.map((t) => `${t.label}: ${t.formula}`),
    });
  const warnings = [DISCLAIMER];
  let blocked = !result.canExport;
  if (project.enabled.ledger) {
    const r = calculateLedger(project.ledger);
    blocked ||= !r.valid;
    const table = (title: string, rows: typeof r.rows): ReportTable => ({
      title,
      headers: [
        "Stakeholder",
        "Type",
        "Shares",
        "Basic issued %",
        "Fully diluted %",
      ],
      rows: rows.map((h) => [
        h.name,
        h.type,
        fmt(h.shares, "shares"),
        fmt(h.basicFraction, "percent", "Not issued"),
        fmt(h.fraction, "percent"),
      ]),
    });
    sections.push({
      id: "ledger",
      title: "Detailed ownership & round ledger",
      status: r.valid ? "valid" : "invalid",
      rows: [
        {
          label: "Secondary gross proceeds (seller, not company cash)",
          value: r.secondaryTotal,
          display: fmt(r.secondaryTotal, "money"),
          unit: currency,
          provenance: "derived",
          status: r.valid ? "valid" : "invalid",
          note: r.errors.join(" "),
        },
      ],
      tables: r.valid
        ? [
            table("Starting capitalization", r.starting),
            ...r.snapshots.map((s) =>
              table(
                `${s.name} · ${s.date} · price ${fmt(s.price, "price")} · primary ${fmt(s.investment, "money")} · pool added ${fmt(s.poolAdded, "shares")}`,
                s.rows,
              ),
            ),
            table("Final capitalization", r.rows),
          ]
        : [],
      formulas: [
        "All investors in a round have one price and identical common-equity rights.",
        "Pre-money pool: x = (q × (1 + I/P) × S − U) / (1 − q × (1 + I/P))",
        "Post-money pool: x = (q × T − U) / (1 − q); existing pool is never cancelled.",
        "Secondary transfers occur before the listed rounds and do not increase company cash.",
      ],
    });
    warnings.push(
      "The detailed ledger is an independent share-based model. It does not change simple-round calculator outputs. Basic issued ownership excludes awards and unallocated options; fully diluted ownership includes both.",
    );
  }
  if (project.enabled.forecast) {
    const r = calculateForecast(project.forecast);
    blocked ||= !r.valid;
    const f = project.forecast;
    const notes = Object.entries(f)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => `${k}: ${v}`);
    sections.push({
      id: "forecast",
      title: `Monthly cash forecast · ${f.case} case`,
      status: r.valid ? "valid" : "invalid",
      rows: [
        {
          label: "First closing cash below zero",
          value: r.belowZero?.toString() ?? null,
          display:
            r.belowZero == null
              ? "No shortfall in the forecast horizon"
              : `Month ${r.belowZero}`,
          unit: "month",
          provenance: "derived",
          status: r.valid ? "valid" : "invalid",
          note: r.errors.join(" "),
        },
        {
          label: "Unallocated net financing",
          value: r.unallocated,
          display: fmt(r.unallocated, "money"),
          unit: currency,
          provenance: "derived",
          status: r.valid ? "valid" : "invalid",
          note: "Allocation budgets are not subtracted a second time from monthly cash.",
        },
      ],
      tables: r.valid
        ? [
            {
              title: "Monthly cash reconciliation",
              headers: [
                "Month",
                "Opening",
                "Receipts",
                "Primary raise",
                "Outflows",
                "Capex",
                "Fees",
                "Closing",
              ],
              rows: r.rows.map((m) => [
                String(m.month),
                ...[
                  m.opening,
                  m.receipts,
                  m.gross,
                  m.outflows,
                  m.capex,
                  m.fees,
                  m.closing,
                ].map((v) => fmt(v, "money")),
              ]),
            },
            {
              title: "Use of funds",
              headers: ["Category", "Budget"],
              rows: Object.entries(f.allocations).map(([k, v]) => [
                k,
                fmt(canonical(v), "money"),
              ]),
            },
          ]
        : [],
      formulas: [
        "Closing = opening + receipts + primary funding − operating outflows − capex − financing fees",
        "Revenue is collected after the selected whole-month delay; no pre-horizon receivables are assumed.",
        ...notes,
      ],
    });
    warnings.push(
      "Forecast funding is scheduled independently from the simple round. Amounts use the same currency; funding is not automatically added to month zero.",
    );
  }
  if (project.enabled.returns) {
    const r = calculateReturns(project.returns);
    blocked ||= !r.valid;
    sections.push({
      id: "returns",
      title: "Common-equity investor outcomes",
      status: r.valid ? "valid" : "invalid",
      rows: [],
      tables: r.valid
        ? [
            {
              title: `Invested ${fmt(canonical(project.returns.invested), "money")} · ownership ${project.returns.ownership}% · ${project.returns.years} years`,
              headers: [
                "Distributable equity proceeds",
                "Investor proceeds",
                "Gross MOIC",
                "Annualized return",
              ],
              rows: r.rows.map((v) => [
                fmt(v.exit, "money"),
                fmt(v.proceeds, "money"),
                fmt(v.moic, "multiple"),
                fmt(v.annualized, "percent"),
              ]),
            },
          ]
        : [],
      formulas: [
        "proceeds = ownership × distributable equity proceeds",
        "MOIC = proceeds / invested cash; annualized = MOIC^(1/years) − 1",
        ...r.errors,
      ],
    });
  }
  if (project.enabled.sensitivity) {
    const r = calculateSensitivity(project.sensitivity);
    blocked ||= !r.valid;
    sections.push({
      id: "sensitivity",
      title: "Valuation sensitivity",
      status: r.valid ? "valid" : "invalid",
      rows: [],
      tables: r.valid
        ? [
            {
              title: "Founder retention · pre-money valuation across columns",
              headers: [
                "Primary investment",
                ...r.valuations.map((v) => fmt(v, "money")),
              ],
              rows: r.rows.map((row) => [
                fmt(row.investment, "money"),
                ...row.cells.map((c) =>
                  c ? fmt(c.founder, "percent") : "Invalid",
                ),
              ]),
            },
          ]
        : [],
      formulas: [
        "Founder retention = starting fraction × P / (P + I)",
        ...r.errors,
      ],
    });
  }
  for (const s of sections)
    if (s.status === "incomplete")
      warnings.push(
        `${s.title} omitted: required optional inputs were not provided.`,
      );
  if (included)
    for (const s of sections)
      if (!included.includes(s.id))
        warnings.push(`${s.title} omitted by report selection.`);
  return {
    name,
    company: project.company.trim() || "Company not provided",
    revision,
    createdAt,
    currency,
    engineVersion: ENGINE_VERSION,
    sections: sections.filter(
      (s) =>
        (!included || included.includes(s.id)) && s.status !== "incomplete",
    ),
    warnings,
    blocked,
    normalized: result.normalized,
  };
}
/** Literal CSV text, including leading whitespace/control characters, is protected from spreadsheet formulas. */
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
    text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function reportCsv(reports: Report[]): string {
  if (reports.some((r) => r.blocked))
    throw new Error("Fix invalid inputs before exporting a complete report.");
  const rows: unknown[][] = [
    [
      "Scenario",
      "Company",
      "Revision",
      "Engine",
      "Report date",
      "Currency",
      "Section",
      "Metric",
      "Canonical value",
      "Display",
      "Unit",
      "Provenance",
      "Status",
      "Notes",
    ],
  ];
  for (const r of reports) {
    const meta = [
      r.name,
      r.company,
      r.revision,
      r.engineVersion,
      r.createdAt,
      r.currency,
    ];
    for (const s of r.sections) {
      for (const v of s.rows)
        rows.push([
          ...meta,
          s.title,
          v.label,
          v.value ?? "",
          v.display,
          v.unit,
          v.provenance,
          v.status,
          v.note,
        ]);
      for (const t of s.tables) {
        rows.push([
          ...meta,
          s.title,
          t.title,
          "",
          t.headers.join(" | "),
          "",
          "derived",
          s.status,
          "",
        ]);
        for (const row of t.rows)
          rows.push([
            ...meta,
            s.title,
            row[0],
            "",
            row.slice(1).join(" | "),
            "See table headers",
            "derived",
            s.status,
            "",
          ]);
      }
      for (const f of s.formulas)
        rows.push([
          ...meta,
          s.title,
          "Formula / assumption",
          "",
          "",
          "",
          "",
          "",
          f,
        ]);
    }
    for (const warning of r.warnings)
      rows.push([...meta, "Notes", "", "", "", "", "", "", warning]);
  }
  if (new Set(reports.map((r) => r.currency)).size > 1)
    rows.push([
      "Comparison",
      "",
      "",
      ENGINE_VERSION,
      "",
      "Mixed",
      "Warning",
      "",
      "",
      "",
      "",
      "",
      "warning",
      "Currencies differ. No conversion, summation or monetary differences are performed.",
    ]);
  return "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
export function download(
  content: string | Blob,
  filename: string,
  mime = "application/json;charset=utf-8",
) {
  const blob =
    typeof content === "string" ? new Blob([content], { type: mime }) : content;
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
