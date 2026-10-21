"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Save,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Share2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import {
  Button,
  Card,
  Confirm,
  Field,
  Modal,
  Notice,
  PageHeader,
  Select,
  Status,
  ExportButtons,
} from "@/components/ui";
import {
  Basis,
  Draft,
  SolveFor,
  calculateRound,
  emptyDraft,
  exampleDraft,
} from "@/lib/engine/round";
import { AmountUnit, UNITS, UNIT_LABEL, toDraftText } from "@/lib/engine/parse";
import { Currency, Notation } from "@/lib/engine/types";
import { D } from "@/lib/engine/decimal";
import { format, shortMoney } from "@/lib/format";
import { buildReport } from "@/lib/report";
import {
  InstrumentResult,
  calculateNote,
  calculateSafe,
} from "@/lib/engine/instruments";
import {
  InstrumentsState,
  readInstruments,
  writeInstruments,
} from "@/lib/instruments-store";
import { buildShareLink, ShareModal } from "@/components/share-link";
import { Project } from "@/lib/workspace";

export default function CalculatorPage() {
  const w = useWorkspace(),
    draft = w.data.draft.draft,
    r = calculateRound(draft);
  const [saving, setSaving] = useState(false),
    [name, setName] = useState(""),
    [reset, setReset] = useState(false),
    [example, setExample] = useState(false),
    [advanced, setAdvanced] = useState(false);
  const [inst, setInst] = useState<InstrumentsState | null>(null),
    [share, setShare] = useState<{ url: string; error: string } | null>(null);
  const auto = useRef(false);
  useEffect(() => {
    if (
      !auto.current &&
      new URLSearchParams(window.location.search).has("example")
    ) {
      auto.current = true;
      setExample(true);
    }
  }, []);
  useEffect(() => setInst(readInstruments()), []);
  useEffect(() => {
    if (inst) writeInstruments(inst);
  }, [inst]);
  const active = w.data.scenarios.find((s) => s.id === w.data.activeId);
  const instTab = inst?.tab ?? "priced";
  const safeResult =
    inst && instTab === "safe" ? calculateSafe(inst.safe, draft.unit) : null;
  const noteResult =
    inst && instTab === "note" ? calculateNote(inst.note, draft.unit) : null;
  const instIssue = (res: InstrumentResult, field: string) =>
    res.sections.flatMap((s) => s.issues).find((i) => i.field === field)
      ?.message;
  const set = (key: keyof Draft, value: string) =>
    w.update((p) => {
      p.draft = { ...p.draft, [key]: value };
      return p;
    });
  function updateInstrument(tab: "safe" | "note", key: string, value: string) {
    setInst((p) => {
      if (!p) return p;
      return tab === "safe"
        ? { ...p, safe: { ...p.safe, [key]: value } }
        : { ...p, note: { ...p.note, [key]: value } };
    });
  }
  function openShare(name: string, project: Project) {
    try {
      setShare({
        url: buildShareLink(window.location.origin, name, project),
        error: "",
      });
    } catch (e) {
      setShare({
        url: "",
        error: e instanceof Error ? e.message : "Could not build the link.",
      });
    }
  }
  function solve(next: SolveFor) {
    w.update((p) => {
      if (r.core) {
        p.draft.valuation = toDraftText(
          D(draft.basis === "pre" ? r.core.pre : r.core.post),
          draft.unit,
          20,
        );
        p.draft.investment = toDraftText(D(r.core.investment), draft.unit, 20);
        p.draft.equity = toDraftText(D(r.core.equity).mul(100), "units", 20);
      }
      p.draft.solveFor = next;
      return p;
    });
  }
  function basis(next: Basis) {
    w.update((p) => {
      if (r.core && draft.solveFor !== "valuation")
        p.draft.valuation = toDraftText(
          D(next === "pre" ? r.core.pre : r.core.post),
          draft.unit,
          20,
        );
      p.draft.basis = next;
      return p;
    });
    w.notify(
      r.core
        ? "Valuation basis converted to preserve the economic offer."
        : "Basis changed. Enter a valuation under the new basis.",
    );
  }
  const solvedValue =
    draft.solveFor === "equity"
      ? r.core?.equity && format(r.core.equity, "percent")
      : r.core &&
        shortMoney(
          draft.solveFor === "investment"
            ? r.core.investment
            : draft.basis === "pre"
              ? r.core.pre
              : r.core.post,
          draft.currency,
          draft.notation,
        );
  const found = r.sections
    .find((s) => s.id === "ownership")
    ?.values.find((v) => v.key === "founderAfter")?.value;
  const resultReport = buildReport(
    w.data.draft,
    active?.name || "Untitled scenario",
  );
  const renderSection = (s: (typeof r.sections)[number]) => (
    <Card key={s.id} title={s.title} action={<Status status={s.status} />}>
      {s.status === "invalid" ? (
        <Notice error>
          {s.issues.map((i) => i.message).join(" ")} This section is suppressed
          until corrected.
        </Notice>
      ) : s.values.length ? (
        <div className="space-y-3">
          {s.values.map((v) => (
            <div key={v.key} className="flex justify-between gap-5 text-sm">
              <span className="text-muted-foreground max-w-[55%]">
                {v.label}
              </span>
              <span className="text-right font-medium tabular-nums break-words">
                {format(
                  v.value,
                  v.kind,
                  draft.currency,
                  draft.notation,
                  v.note,
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{s.summary}</p>
      )}
      {s.values.length > 0 && (
        <details className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <summary className="cursor-pointer text-primary">
            How this is calculated
          </summary>
          <div className="mt-3 space-y-2 font-mono leading-relaxed">
            {s.trace.map((t) => (
              <p key={t.label}>{t.formula}</p>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
  return (
    <>
      <PageHeader
        eyebrow="The starting point"
        title="Understand your next raise."
        description="Start with any two known values. We’ll solve the third and show you exactly what it means."
        actions={
          <>
            <Button variant="secondary" onClick={() => setExample(true)}>
              <Sparkles className="size-4" />
              Load example
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                openShare(active?.name || "Untitled draft", w.data.draft)
              }
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              disabled={!r.canExport}
              onClick={() => {
                setName(active?.name || "");
                setSaving(true);
              }}
            >
              <Save className="size-4" />
              Save scenario
            </Button>
          </>
        }
      />
      <div className="grid xl:grid-cols-[1fr_.95fr] gap-6 items-start">
        <div className="space-y-5">
          <div
            role="tablist"
            aria-label="Instrument type"
            className="flex gap-1 p-1 bg-secondary rounded-xl"
          >
            {(
              [
                ["priced", "Priced round"],
                ["safe", "SAFE"],
                ["note", "Note"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                role="tab"
                aria-selected={instTab === t}
                onClick={() => setInst((p) => (p ? { ...p, tab: t } : p))}
                className={`flex-1 text-xs sm:text-sm px-2 py-2.5 rounded-lg font-medium ${instTab === t ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {instTab === "priced" && (
            <>
              <Card
                title="Round assumptions"
                description="Primary priced round · Common-equity economics"
                action={
                  <button
                    onClick={() => setReset(true)}
                    className="text-muted-foreground hover:text-primary p-1"
                    aria-label="Reset calculator"
                  >
                    <RotateCcw className="size-4" />
                  </button>
                }
              >
                <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-6">
                  {(["equity", "investment", "valuation"] as SolveFor[]).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => solve(s)}
                        className={`flex-1 text-xs sm:text-sm px-2 py-2.5 rounded-lg font-medium ${draft.solveFor === s ? "bg-white shadow-sm text-primary" : "text-muted-foreground"}`}
                      >
                        Solve {s}
                      </button>
                    ),
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <Select
                    label="Valuation basis"
                    value={draft.basis}
                    onChange={(v) => basis(v as Basis)}
                    options={[
                      { value: "pre", label: "Pre-money" },
                      { value: "post", label: "Post-money" },
                    ]}
                  />
                  <Select
                    label="Currency"
                    value={draft.currency}
                    onChange={(v) => set("currency", v as Currency)}
                    options={["INR", "USD", "GBP", "EUR"].map((c) => ({
                      value: c,
                      label: c,
                    }))}
                  />
                  <Select
                    label="Amount entry unit"
                    value={draft.unit}
                    onChange={(v) => {
                      const previous = draft.unit;
                      const multiplier: Record<string, string> = {
                        units: "1",
                        thousand: "1000",
                        lakh: "100000",
                        million: "1000000",
                        crore: "10000000",
                        billion: "1000000000",
                      };
                      w.update((p) => {
                        for (const k of [
                          "valuation",
                          "investment",
                          "cash",
                          "burn",
                          "fixed",
                          "reserve",
                          "revenue",
                        ] as const) {
                          try {
                            if (p.draft[k].trim())
                              p.draft[k] = toDraftText(
                                D(p.draft[k].replace(/[,_\s]/g, "")).mul(
                                  multiplier[previous],
                                ),
                                v as AmountUnit,
                                20,
                              );
                          } catch {}
                        }
                        p.draft.unit = v as AmountUnit;
                        return p;
                      });
                    }}
                    options={UNITS.map((u) => ({
                      value: u,
                      label: UNIT_LABEL[u],
                    }))}
                  />
                  <Select
                    label="Display notation"
                    value={draft.notation}
                    onChange={(v) => set("notation", v as Notation)}
                    options={[
                      { value: "indian", label: "Indian (lakh / crore)" },
                      {
                        value: "international",
                        label: "International (million / billion)",
                      },
                    ]}
                  />
                </div>
                <div className="space-y-4">
                  {(["valuation", "investment", "equity"] as const).map((k) => (
                    <Field
                      key={k}
                      label={
                        k === "valuation"
                          ? `${draft.basis === "pre" ? "Pre" : "Post"}-money equity valuation`
                          : k === "investment"
                            ? "Gross primary investment"
                            : "New investor ownership"
                      }
                      value={
                        draft.solveFor === k
                          ? r.core
                            ? k === "equity"
                              ? D(r.core.equity)
                                  .mul(100)
                                  .toDecimalPlaces(4)
                                  .toFixed()
                              : toDraftText(
                                  D(
                                    k === "investment"
                                      ? r.core.investment
                                      : draft.basis === "pre"
                                        ? r.core.pre
                                        : r.core.post,
                                  ),
                                  draft.unit,
                                )
                            : ""
                          : draft[k]
                      }
                      onChange={(v) => set(k, v)}
                      readOnly={draft.solveFor === k}
                      suffix={k === "equity" ? "%" : `${draft.currency}`}
                      error={r.errors[k]}
                      hint={
                        draft.solveFor === k
                          ? "Calculated from the two authoritative inputs."
                          : undefined
                      }
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-4">
                  All monetary entries use{" "}
                  {UNIT_LABEL[draft.unit].toLowerCase()}. “.” is the decimal
                  separator. Currency selection never converts amounts.
                </p>
              </Card>
              <Card>
                <button
                  className="flex w-full justify-between items-center text-sm font-semibold"
                  onClick={() => setAdvanced(!advanced)}
                  aria-expanded={advanced}
                >
                  Ownership & cash planning{" "}
                  <span className="flex gap-2 items-center text-xs text-muted-foreground">
                    Optional
                    {Object.keys(r.errors).some(
                      (k) => !["valuation", "investment", "equity"].includes(k),
                    ) && <span className="text-red-600">· Errors</span>}
                    <ChevronDown
                      className={`size-4 ${advanced ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                {advanced && (
                  <div className="grid sm:grid-cols-2 gap-5 mt-6">
                    {(
                      [
                        {
                          key: "founder",
                          label: "Founder ownership before",
                          suffix: "%",
                          hint: "Explicit simple-mode starting assumption: 100%.",
                        },
                        {
                          key: "shares",
                          label: "Existing fully diluted shares",
                          suffix: "shares",
                          hint: "Optional. Includes outstanding awards and unallocated pool.",
                        },
                        { key: "cash", label: "Current cash" },
                        {
                          key: "burn",
                          label: "Monthly net burn",
                          hint: "Zero means no depletion at current burn.",
                        },
                        { key: "fee", label: "Financing fee", suffix: "%" },
                        { key: "fixed", label: "Fixed transaction costs" },
                        {
                          key: "target",
                          label: "Target runway",
                          suffix: "months",
                        },
                        { key: "reserve", label: "Reserve target" },
                        {
                          key: "revenue",
                          label: "Annual revenue",
                          hint: "Revenue, not ARR. Multiple uses pre-money equity value.",
                        },
                      ] as {
                        key: keyof Draft;
                        label: string;
                        hint?: string;
                        suffix?: string;
                      }[]
                    ).map((f) => (
                      <Field
                        key={f.key}
                        label={f.label}
                        value={draft[f.key]}
                        suffix={f.suffix}
                        hint={f.hint}
                        error={r.errors[f.key]}
                        onChange={(v) => set(f.key, v)}
                      />
                    ))}
                  </div>
                )}
              </Card>
              <Notice>
                Gross investment determines ownership. Fees reduce company cash,
                not investor shares.{" "}
                <Link href="/guide" className="underline">
                  See assumptions & formulas.
                </Link>
              </Notice>
            </>
          )}
          {instTab === "safe" && inst && safeResult && (
            <>
              <Card
                title="SAFE terms"
                description="Post-money SAFE · Standard cap mechanics"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Post-money valuation cap"
                    value={inst.safe.cap}
                    suffix={draft.currency}
                    error={instIssue(safeResult, "cap")}
                    onChange={(v) => updateInstrument("safe", "cap", v)}
                  />
                  <Field
                    label="SAFE investment (gross)"
                    value={inst.safe.investment}
                    suffix={draft.currency}
                    error={instIssue(safeResult, "investment")}
                    onChange={(v) => updateInstrument("safe", "investment", v)}
                  />
                  <Field
                    className="sm:col-span-2"
                    label="Pre-round fully diluted shares"
                    value={inst.safe.shares}
                    suffix="shares"
                    hint="Optional. Adds conversion price and share issuance."
                    error={instIssue(safeResult, "shares")}
                    onChange={(v) => updateInstrument("safe", "shares", v)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-4">
                  Ownership = investment ÷ cap. Amounts use{" "}
                  {UNIT_LABEL[draft.unit].toLowerCase()}.
                </p>
              </Card>
              <Notice>
                Planning estimate, not a contract model: actual conversion
                follows the instrument’s own language.{" "}
                <Link href="/guide" className="underline">
                  See instrument formulas.
                </Link>
              </Notice>
            </>
          )}
          {instTab === "note" && inst && noteResult && (
            <>
              <Card
                title="Note terms"
                description="Simple-interest note · Lower of cap or discount governs"
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field
                    label="Valuation cap"
                    value={inst.note.cap}
                    suffix={draft.currency}
                    error={instIssue(noteResult, "cap")}
                    onChange={(v) => updateInstrument("note", "cap", v)}
                  />
                  <Field
                    label="Principal investment"
                    value={inst.note.investment}
                    suffix={draft.currency}
                    error={instIssue(noteResult, "investment")}
                    onChange={(v) => updateInstrument("note", "investment", v)}
                  />
                  <Field
                    label="Pre-round fully diluted shares"
                    value={inst.note.shares}
                    suffix="shares"
                    error={instIssue(noteResult, "shares")}
                    onChange={(v) => updateInstrument("note", "shares", v)}
                  />
                  <Field
                    label="Annual interest rate"
                    value={inst.note.rate}
                    suffix="%"
                    hint="Optional. Simple, non-compounding."
                    error={instIssue(noteResult, "rate")}
                    onChange={(v) => updateInstrument("note", "rate", v)}
                  />
                  <Field
                    label="Months to conversion"
                    value={inst.note.months}
                    suffix="months"
                    hint="Optional. Time until the note converts."
                    error={instIssue(noteResult, "months")}
                    onChange={(v) => updateInstrument("note", "months", v)}
                  />
                  <Field
                    label="Discount"
                    value={inst.note.discount}
                    suffix="%"
                    hint="Optional. Off the next-round price per share."
                    error={instIssue(noteResult, "discount")}
                    onChange={(v) => updateInstrument("note", "discount", v)}
                  />
                  <Field
                    className="sm:col-span-2"
                    label="Next-round price per share"
                    value={inst.note.roundPrice}
                    suffix={draft.currency}
                    hint="Optional. Enables the discount leg."
                    error={instIssue(noteResult, "roundPrice")}
                    onChange={(v) => updateInstrument("note", "roundPrice", v)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-4">
                  Accrued = principal × (1 + rate × months ÷ 12). Conversion
                  uses the lower of the cap price and the discounted round
                  price. Amounts use {UNIT_LABEL[draft.unit].toLowerCase()}.
                </p>
              </Card>
              <Notice>
                Planning estimate, not a contract model: actual conversion
                follows the instrument’s own language.{" "}
                <Link href="/guide" className="underline">
                  See instrument formulas.
                </Link>
              </Notice>
            </>
          )}
        </div>
        <div className="space-y-5">
          {instTab === "priced" && (
            <>
              <section className="purple-panel rounded-2xl p-6 sm:p-7">
                <div className="relative">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-xs uppercase tracking-[.15em] text-violet-200">
                      Your round, at a glance
                    </p>
                    <span className="glass-on-purple text-[10px] px-2.5 py-1 rounded-full">
                      {r.core ? "LIVE RESULT" : "AWAITING INPUTS"}
                    </span>
                  </div>
                  <p className="text-xs text-violet-200">
                    {draft.solveFor === "equity"
                      ? "New investor ownership"
                      : draft.solveFor === "investment"
                        ? "Gross primary investment"
                        : `${draft.basis === "pre" ? "Pre" : "Post"}-money valuation`}
                  </p>
                  <p className="text-4xl sm:text-5xl font-semibold tracking-tight mt-3 break-words">
                    {solvedValue || "—"}
                  </p>
                  <p className="text-xs text-violet-200/80 mt-3">
                    {r.core
                      ? "Immediately after this primary priced round"
                      : "Enter the two known values to calculate"}
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-7 border-t border-white/15 pt-5">
                    <div>
                      <p className="text-[10px] text-violet-200">
                        Post-money equity value
                      </p>
                      <p className="font-semibold mt-1">
                        {r.core
                          ? shortMoney(
                              r.core.post,
                              draft.currency,
                              draft.notation,
                            )
                          : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-violet-200">
                        Founder retention
                      </p>
                      <p className="font-semibold mt-1">
                        {found ? format(found, "percent") : "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              {r.sections.filter((s) => s.id !== "core").map(renderSection)}
              <Card
                title="Take the numbers with you"
                description={
                  resultReport.blocked
                    ? "Complete core inputs and correct invalid assumptions to export."
                    : "Missing optional sections are explicitly omitted. The PDF and CSV share the same dataset."
                }
              >
                <ExportButtons reports={[resultReport]} />
                <Link
                  href="/reports"
                  className="text-primary text-xs inline-flex gap-1 mt-4"
                >
                  Preview full report <ArrowRight className="size-3" />
                </Link>
              </Card>
            </>
          )}
          {instTab === "safe" && safeResult && (
            <>
              <section className="purple-panel rounded-2xl p-6 sm:p-7">
                <div className="relative">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-xs uppercase tracking-[.15em] text-violet-200">
                      SAFE conversion
                    </p>
                    <span className="glass-on-purple text-[10px] px-2.5 py-1 rounded-full">
                      {safeResult.valid ? "LIVE RESULT" : "AWAITING INPUTS"}
                    </span>
                  </div>
                  <p className="text-xs text-violet-200">
                    New investor ownership
                  </p>
                  <p className="text-4xl sm:text-5xl font-semibold tracking-tight mt-3 break-words">
                    {safeResult.headline.ownership
                      ? format(safeResult.headline.ownership, "percent")
                      : "—"}
                  </p>
                  <p className="text-xs text-violet-200/80 mt-3">
                    Post-money SAFE · the cap is the post-money valuation
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-7 border-t border-white/15 pt-5">
                    <div>
                      <p className="text-[10px] text-violet-200">
                        Conversion price per share
                      </p>
                      <p className="font-semibold mt-1">
                        {safeResult.headline.price
                          ? format(
                              safeResult.headline.price,
                              "price",
                              draft.currency,
                              draft.notation,
                            )
                          : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-violet-200">
                        Shares issued on conversion
                      </p>
                      <p className="font-semibold mt-1">
                        {safeResult.headline.shares
                          ? format(
                              safeResult.headline.shares,
                              "shares",
                              draft.currency,
                              draft.notation,
                            )
                          : "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              {safeResult.sections.map(renderSection)}
            </>
          )}
          {instTab === "note" && noteResult && (
            <>
              <section className="purple-panel rounded-2xl p-6 sm:p-7">
                <div className="relative">
                  <div className="flex justify-between items-center mb-6">
                    <p className="text-xs uppercase tracking-[.15em] text-violet-200">
                      Note conversion
                    </p>
                    <span className="glass-on-purple text-[10px] px-2.5 py-1 rounded-full">
                      {noteResult.valid ? "LIVE RESULT" : "AWAITING INPUTS"}
                    </span>
                  </div>
                  <p className="text-xs text-violet-200">
                    New investor ownership
                  </p>
                  <p className="text-4xl sm:text-5xl font-semibold tracking-tight mt-3 break-words">
                    {noteResult.headline.ownership
                      ? format(noteResult.headline.ownership, "percent")
                      : "—"}
                  </p>
                  <p className="text-xs text-violet-200/80 mt-3">
                    Accrued interest converts at the lower of cap or discount
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-7 border-t border-white/15 pt-5">
                    <div>
                      <p className="text-[10px] text-violet-200">
                        Applied conversion price
                      </p>
                      <p className="font-semibold mt-1">
                        {noteResult.headline.price
                          ? format(
                              noteResult.headline.price,
                              "price",
                              draft.currency,
                              draft.notation,
                            )
                          : "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-violet-200">
                        Amount owed at conversion
                      </p>
                      <p className="font-semibold mt-1">
                        {format(
                          noteResult.sections
                            .flatMap((s) => s.values)
                            .find((v) => v.key === "accruedEcho")?.value ??
                            null,
                          "money",
                          draft.currency,
                          draft.notation,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              {noteResult.sections.map(renderSection)}
            </>
          )}
        </div>
      </div>
      <Modal
        open={saving}
        title={active ? "Save a scenario revision" : "Save your scenario"}
        onClose={() => setSaving(false)}
      >
        <Field
          label="Scenario name"
          value={name}
          onChange={setName}
          placeholder="e.g. Seed offer — October"
          hint="Saved in this browser. Download a backup for a separate copy."
        />
        <div className="flex flex-wrap gap-2 justify-end mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              if (w.save(name)) setSaving(false);
            }}
          >
            Save as new
          </Button>
          {active && (
            <Button
              onClick={() => {
                if (w.save(name, true)) setSaving(false);
              }}
            >
              Update · new revision
            </Button>
          )}
        </div>
      </Modal>
      <Confirm
        open={reset}
        title="Reset calculator inputs?"
        description="Current calculator edits will be discarded. Saved scenarios and other planning modules are retained."
        onClose={() => setReset(false)}
        onConfirm={() => w.update((p) => ({ ...p, draft: { ...emptyDraft } }))}
      />
      <Confirm
        open={example}
        title="Load the worked example?"
        description="This replaces current calculator inputs with a clearly labeled reference example: ₹5 Cr pre-money, ₹1 Cr investment, 60% founder ownership. Saved scenarios are retained."
        onClose={() => setExample(false)}
        onConfirm={() => {
          w.update((p) => ({ ...p, draft: { ...exampleDraft } }));
          w.notify("Worked example loaded — these are illustrative inputs.");
        }}
      />
      <ShareModal
        open={!!share}
        url={share?.url ?? ""}
        error={share?.error ?? ""}
        onClose={() => setShare(null)}
      />
    </>
  );
}
