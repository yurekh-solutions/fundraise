"use client";
import { Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import {
  Button,
  Card,
  EnableSection,
  Errors,
  Field,
  Metric,
  Notice,
  PageHeader,
  Select,
  Table,
} from "@/components/ui";
import { ForecastInput, calculateForecast } from "@/lib/engine/planning";
import { uuid } from "@/lib/workspace";
import { format, shortMoney } from "@/lib/format";
import { D } from "@/lib/engine/decimal";
export default function ForecastPage() {
  const w = useWorkspace(),
    p = w.data.draft,
    f = p.forecast,
    r = calculateForecast(f),
    currency = p.draft.currency;
  const change = (fn: (f: ForecastInput) => void) =>
    w.update((p) => {
      fn(p.forecast);
      return p;
    });
  const set = (k: keyof ForecastInput, v: string) =>
    change((f) => {
      Object.assign(f, { [k]: v });
    });
  const money = (v: string) => format(v, "money", currency, p.draft.notation);
  const cases = (["base", "upside", "downside"] as const).map((c) => ({
    case: c,
    result: calculateForecast({ ...f, case: c }),
  }));
  return (
    <>
      <PageHeader
        eyebrow="Make the cash last"
        title="Plan beyond the closing date."
        description="Monthly cash collections, expenses, hiring and primary funding — with explicit dates and assumptions. All amounts are currency major units."
      />
      <div className="mb-5">
        <EnableSection
          section="cash forecast"
          enabled={p.enabled.forecast}
          onChange={(v) =>
            w.update((p) => ({ ...p, enabled: { ...p.enabled, forecast: v } }))
          }
        />
      </div>
      <div className="space-y-5">
        <Card
          title="Operating assumptions"
          description={`Currency: ${currency} · No pre-horizon receivables · End-of-month cash balances`}
          action={
            <div className="flex gap-1">
              {[12, 24, 36].map((n) => (
                <button
                  key={n}
                  onClick={() => set("months", String(n))}
                  className={`rounded-lg px-2.5 py-1.5 text-xs ${f.months === String(n) ? "bg-violet-100 text-primary" : "bg-secondary"}`}
                >
                  {n}m
                </button>
              ))}
            </div>
          }
        >
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {(
              [
                { key: "months", label: "Forecast horizon", suffix: "months" },
                { key: "opening", label: "Opening cash" },
                { key: "reserve", label: "Reserve target" },
                { key: "revenue", label: "Initial monthly accrual revenue" },
                { key: "growth", label: "Monthly revenue growth", suffix: "%" },
                { key: "cogs", label: "COGS / accrual revenue", suffix: "%" },
                { key: "opex", label: "Initial monthly operating expenses" },
                {
                  key: "expenseGrowth",
                  label: "Monthly operating expense growth",
                  suffix: "%",
                },
                {
                  key: "delay",
                  label: "Cash collection delay",
                  suffix: "months",
                },
              ] as {
                key: keyof ForecastInput;
                label: string;
                suffix?: string;
              }[]
            ).map((v) => (
              <Field
                key={v.key}
                label={v.label}
                value={String(f[v.key])}
                suffix={v.suffix}
                onChange={(value) => set(v.key, value)}
              />
            ))}
          </div>
          <div className="mt-5">
            <Notice>
              Revenue is collected after the selected whole-month delay. COGS is
              paid in the revenue month; operating expenses and salaries are
              paid monthly. No partial-month interpolation or pre-horizon
              receivables are modeled.
            </Notice>
          </div>
        </Card>
        <Card
          title="Operating cases"
          description="User-defined changes to revenue and recurring expenses. These are alternatives, not probabilities."
        >
          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <Select
              label="Active case"
              value={f.case}
              onChange={(v) => set("case", v)}
              options={["base", "upside", "downside"].map((c) => ({
                value: c,
                label: c[0].toUpperCase() + c.slice(1),
              }))}
            />
            {(
              [
                "upsideRevenue",
                "upsideExpense",
                "downsideRevenue",
                "downsideExpense",
              ] as const
            ).map((k) => (
              <Field
                key={k}
                label={k.replace(/([A-Z])/g, " $1")}
                value={f[k]}
                suffix="%"
                onChange={(v) => set(k, v)}
              />
            ))}
          </div>
        </Card>
        <Card
          title="Hiring plan"
          description="Loaded monthly salary includes all employer costs. Start month is inclusive."
          action={
            <Button
              variant="secondary"
              onClick={() =>
                change((f) =>
                  f.hires.push({
                    id: uuid(),
                    name: "",
                    start: "1",
                    count: "1",
                    salary: "",
                  }),
                )
              }
            >
              <Plus className="size-4" />
              Add hire
            </Button>
          }
        >
          <div className="space-y-4">
            {f.hires.map((h, i) => (
              <div
                key={h.id}
                className="grid sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto] items-end gap-3"
              >
                {(["name", "start", "count", "salary"] as const).map((k) => (
                  <Field
                    key={k}
                    label={
                      {
                        name: "Role name",
                        start: "Start month",
                        count: "Headcount",
                        salary: "Loaded salary / month",
                      }[k]
                    }
                    value={h[k]}
                    onChange={(v) =>
                      change((f) => {
                        f.hires[i][k] = v;
                      })
                    }
                  />
                ))}
                <button
                  aria-label="Remove hire"
                  className="p-3 text-muted-foreground"
                  onClick={() =>
                    change((f) => {
                      f.hires.splice(i, 1);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {!f.hires.length && (
            <p className="text-sm text-muted-foreground">
              No incremental hires scheduled.
            </p>
          )}
        </Card>
        <Card
          title="Dated primary funding"
          description="Month 1 is the first forecast month. Funding is received only in its selected month, not automatically at opening."
          action={
            <Button
              variant="secondary"
              onClick={() =>
                change((f) =>
                  f.funding.push({
                    id: uuid(),
                    month: "1",
                    gross: "",
                    fee: "0",
                    fixed: "0",
                  }),
                )
              }
            >
              <Plus className="size-4" />
              Add funding
            </Button>
          }
        >
          <div className="space-y-4">
            {f.funding.map((h, i) => (
              <div
                key={h.id}
                className="grid sm:grid-cols-2 xl:grid-cols-[1fr_1.5fr_1fr_1fr_auto] items-end gap-3"
              >
                {(["month", "gross", "fee", "fixed"] as const).map((k) => (
                  <Field
                    key={k}
                    label={
                      {
                        month: "Receipt month",
                        gross: "Gross primary cash",
                        fee: "Fee (%)",
                        fixed: "Fixed financing costs",
                      }[k]
                    }
                    value={h[k]}
                    onChange={(v) =>
                      change((f) => {
                        f.funding[i][k] = v;
                      })
                    }
                  />
                ))}
                <button
                  aria-label="Remove funding"
                  className="p-3 text-muted-foreground"
                  onClick={() =>
                    change((f) => {
                      f.funding.splice(i, 1);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {!f.funding.length && (
            <p className="text-sm text-muted-foreground">
              No primary financing scheduled. The simple calculator’s raise is
              not double-counted here.
            </p>
          )}
        </Card>
        <Card
          title="One-off costs & capex"
          action={
            <Button
              variant="secondary"
              onClick={() =>
                change((f) =>
                  f.costs.push({
                    id: uuid(),
                    month: "1",
                    amount: "",
                    category: "capex",
                  }),
                )
              }
            >
              <Plus className="size-4" />
              Add cost
            </Button>
          }
        >
          <div className="space-y-4">
            {f.costs.map((c, i) => (
              <div
                key={c.id}
                className="grid sm:grid-cols-[1fr_1fr_1fr_auto] items-end gap-3"
              >
                <Field
                  label="Cost month"
                  value={c.month}
                  onChange={(v) =>
                    change((f) => {
                      f.costs[i].month = v;
                    })
                  }
                />
                <Field
                  label="One-off amount"
                  value={c.amount}
                  onChange={(v) =>
                    change((f) => {
                      f.costs[i].amount = v;
                    })
                  }
                />
                <Select
                  label="Category"
                  value={c.category}
                  onChange={(v) =>
                    change((f) => {
                      f.costs[i].category = v as "capex" | "operations";
                    })
                  }
                  options={[
                    { value: "capex", label: "Capex" },
                    { value: "operations", label: "Operations" },
                  ]}
                />
                <button
                  aria-label="Remove cost"
                  className="p-3 text-muted-foreground"
                  onClick={() =>
                    change((f) => {
                      f.costs.splice(i, 1);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {!f.costs.length && (
            <p className="text-sm text-muted-foreground">
              No one-off costs scheduled.
            </p>
          )}
        </Card>
        <Card
          title="Month-specific overrides"
          description="Optional absolute base-case values replace growth-driven revenue, COGS and operating expenses for a selected month."
          action={
            <Button
              variant="secondary"
              onClick={() =>
                change((f) =>
                  f.overrides.push({
                    month: "1",
                    revenue: "",
                    cogs: "",
                    opex: "",
                  }),
                )
              }
            >
              <Plus className="size-4" />
              Override
            </Button>
          }
        >
          <div className="space-y-4">
            {f.overrides.map((o, i) => (
              <div
                key={i}
                className="grid sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end"
              >
                {(["month", "revenue", "cogs", "opex"] as const).map((k) => (
                  <Field
                    key={k}
                    label={`Override ${k}`}
                    value={o[k]}
                    onChange={(v) =>
                      change((f) => {
                        f.overrides[i][k] = v;
                      })
                    }
                  />
                ))}
                <button
                  aria-label="Remove override"
                  className="p-3 text-muted-foreground"
                  onClick={() =>
                    change((f) => {
                      f.overrides.splice(i, 1);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          {!f.overrides.length && (
            <p className="text-sm text-muted-foreground">
              Every month uses the growth-driven assumptions above.
            </p>
          )}
        </Card>
        <Card
          title="Use of net financing proceeds"
          description="Allocation budgets are a planning breakdown — not additional spending. Actual spending must be scheduled above."
        >
          <div className="grid sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {(Object.keys(f.allocations) as (keyof typeof f.allocations)[]).map(
              (k) => (
                <Field
                  key={k}
                  label={k[0].toUpperCase() + k.slice(1)}
                  value={f.allocations[k]}
                  onChange={(v) =>
                    change((f) => {
                      f.allocations[k] = v;
                    })
                  }
                />
              ),
            )}
          </div>
          {r.valid && (
            <p className="text-xs text-primary mt-4">
              Unallocated: {money(r.unallocated)} of {money(r.netFunding)} net
              financing
            </p>
          )}
        </Card>
        <Errors errors={r.errors} />
        {r.valid && (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <Metric
                label="First month below zero"
                value={r.belowZero ? `Month ${r.belowZero}` : "No shortfall"}
                note="Within the selected forecast horizon"
              />
              <Metric
                label="First month below reserve"
                value={r.belowReserve ? `Month ${r.belowReserve}` : "No breach"}
                note={
                  r.openingShortfall
                    ? "Opening cash is already below reserve"
                    : "End-of-month cash check"
                }
              />
              <Metric
                label="Closing cash at horizon"
                value={shortMoney(
                  r.rows.at(-1)!.closing,
                  currency,
                  p.draft.notation,
                )}
                note={`${f.months}-month ${f.case} case`}
              />
            </div>
            <Card
              title="Cash trajectory"
              description="End-of-month closing cash. Use the reconciliation table below for exact figures."
            >
              <div className="flex gap-1 h-32 items-center" aria-hidden="true">
                {r.rows.map((m) => {
                  const maxV = Math.max(
                    ...r.rows.map((v) => Math.abs(Number(v.closing))),
                    1,
                  );
                  return (
                    <div
                      key={m.month}
                      className={`flex-1 rounded-sm ${D(m.closing).lt(0) ? "bg-rose-400" : "bg-violet-500"}`}
                      style={{
                        height: `${Math.max(2, (Math.abs(Number(m.closing)) / maxV) * 100)}%`,
                      }}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Violet: nonnegative cash · Rose: cash shortfall · Months 1–
                {f.months}
              </p>
            </Card>
            <Card
              title="Cash reconciliation"
              description="Closing = opening + receipts + funding − operating outflows − capex − fees"
            >
              <Table
                label="Monthly cash flow reconciliation"
                headers={[
                  "Month",
                  "Opening",
                  "Receipts",
                  "Funding",
                  "Outflows",
                  "Capex",
                  "Fees",
                  "Closing",
                ]}
                rows={r.rows.map((m) => [
                  m.month,
                  ...[
                    m.opening,
                    m.receipts,
                    m.gross,
                    m.outflows,
                    m.capex,
                    m.fees,
                    m.closing,
                  ].map(money),
                ])}
              />
            </Card>
            <Card title="Operating case comparison">
              <Table
                label="Base upside downside cash comparison"
                headers={[
                  "Case",
                  "Closing cash",
                  "Below zero",
                  "Below reserve",
                ]}
                rows={cases.map((c) => [
                  c.case,
                  c.result.valid
                    ? money(c.result.rows.at(-1)!.closing)
                    : "Invalid",
                  c.result.belowZero
                    ? `Month ${c.result.belowZero}`
                    : "No shortfall in horizon",
                  c.result.belowReserve
                    ? `Month ${c.result.belowReserve}`
                    : "No breach in horizon",
                ])}
              />
            </Card>
          </>
        )}
        <Notice>
          Save these forecast inputs as a scenario revision from the calculator.
          No shortfall in the forecast horizon does not mean infinite runway.
        </Notice>
      </div>
    </>
  );
}
