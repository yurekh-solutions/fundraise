"use client";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-provider";
import {
  Card,
  EnableSection,
  Errors,
  Field,
  Notice,
  PageHeader,
  Table,
} from "@/components/ui";
import { SensitivityInput, calculateSensitivity } from "@/lib/engine/planning";
import { format, shortMoney } from "@/lib/format";
export default function SensitivityPage() {
  const w = useWorkspace(),
    p = w.data.draft,
    s = p.sensitivity,
    r = calculateSensitivity(s),
    [metric, setMetric] = useState<"founder" | "equity">("founder");
  const set = (k: keyof SensitivityInput, v: string) =>
    w.update((p) => ({ ...p, sensitivity: { ...p.sensitivity, [k]: v } }));
  return (
    <>
      <PageHeader
        eyebrow="What if the offer changes?"
        title="Explore the trade-offs."
        description="Vary pre-money valuation and primary investment together. Currency and common-equity financing terms remain constant."
      />
      <div className="mb-5">
        <EnableSection
          section="sensitivity"
          enabled={p.enabled.sensitivity}
          onChange={(v) =>
            w.update((p) => ({
              ...p,
              enabled: { ...p.enabled, sensitivity: v },
            }))
          }
        />
      </div>
      <div className="space-y-5">
        <Card
          title="User-defined ranges"
          description={`Amounts are ${p.draft.currency} major units · 2–11 points per axis`}
        >
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {(
              [
                { key: "minVal", label: "Minimum pre-money valuation" },
                { key: "maxVal", label: "Maximum pre-money valuation" },
                { key: "minRaise", label: "Minimum primary raise" },
                { key: "maxRaise", label: "Maximum primary raise" },
                { key: "points", label: "Points per axis" },
                { key: "founder", label: "Starting founder ownership (%)" },
              ] as { key: keyof SensitivityInput; label: string }[]
            ).map((f) => (
              <Field
                key={f.key}
                label={f.label}
                value={s[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </div>
        </Card>
        <Errors errors={r.errors} />
        {r.valid && (
          <Card
            title={
              metric === "founder"
                ? "Founder retention matrix"
                : "Investor ownership matrix"
            }
            action={
              <div className="flex text-xs gap-1 bg-secondary p-1 rounded-lg">
                {(["founder", "equity"] as const).map((m) => (
                  <button
                    key={m}
                    className={`px-3 py-1.5 rounded-md ${metric === m ? "bg-white text-primary" : ""}`}
                    onClick={() => setMetric(m)}
                  >
                    {m === "founder" ? "Founder" : "Investor"}
                  </button>
                ))}
              </div>
            }
          >
            <Table
              label="Sensitivity matrix: investment rows and pre-money valuation columns"
              headers={[
                "Primary raise ↓ / Pre-money →",
                ...r.valuations.map((v) =>
                  shortMoney(v, p.draft.currency, p.draft.notation),
                ),
              ]}
              rows={r.rows.map((row) => [
                shortMoney(row.investment, p.draft.currency, p.draft.notation),
                ...row.cells.map((c) =>
                  c ? (
                    <span
                      className="inline-block rounded-lg px-3 py-2 font-semibold text-violet-900"
                      style={{
                        background: `rgba(124,58,237,${0.05 + Number(c[metric]) * 0.2})`,
                      }}
                    >
                      {format(c[metric], "percent")}
                    </span>
                  ) : (
                    "Invalid"
                  ),
                ),
              ])}
            />
            <p className="text-xs text-muted-foreground mt-4">
              Plain tabular values accompany the color scale. Invalid
              combinations stay labeled invalid — never zero-filled.
            </p>
          </Card>
        )}
        <Notice>
          Founder retention = starting fraction × P / (P + I). This matrix
          excludes new option pools, convertibles and secondary transactions.
        </Notice>
      </div>
    </>
  );
}
