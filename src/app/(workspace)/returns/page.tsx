"use client";
import { Plus, Trash2, LockKeyhole } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import {
  Button,
  Card,
  EnableSection,
  Errors,
  Field,
  Notice,
  PageHeader,
  Table,
} from "@/components/ui";
import { calculateReturns } from "@/lib/engine/planning";
import { calculateRound } from "@/lib/engine/round";
import { format } from "@/lib/format";
import { D } from "@/lib/engine/decimal";
export default function ReturnsPage() {
  const w = useWorkspace(),
    p = w.data.draft,
    input = p.returns,
    r = calculateReturns(input),
    core = calculateRound(p.draft).core;
  const set = (key: "invested" | "ownership" | "years", value: string) =>
    w.update((p) => ({ ...p, returns: { ...p.returns, [key]: value } }));
  const fmt = (v: string, kind: "money" | "multiple" | "percent") =>
    format(v, kind, p.draft.currency, p.draft.notation);
  return (
    <>
      <PageHeader
        eyebrow="Explore the investor side"
        title="What could an exit mean?"
        description="Common-equity outcomes from user-supplied distributable equity proceeds. One initial investment, one final payout — no preferences or debt waterfall."
      />
      <div className="mb-5">
        <EnableSection
          section="investor outcomes"
          enabled={p.enabled.returns}
          onChange={(v) =>
            w.update((p) => ({ ...p, enabled: { ...p.enabled, returns: v } }))
          }
        />
      </div>
      <div className="space-y-5">
        <Notice>
          Enter distributable equity proceeds after debt and transaction costs,
          not enterprise value. These are scenarios, not predictions or
          investment recommendations.
        </Notice>
        <Card
          title="Investment assumptions"
          action={
            <Button
              variant="secondary"
              disabled={!core}
              onClick={() => {
                if (core)
                  w.update((p) => ({
                    ...p,
                    returns: {
                      ...p.returns,
                      invested: core.investment,
                      ownership: D(core.equity).mul(100).toFixed(),
                    },
                  }));
              }}
            >
              Use current round
            </Button>
          }
        >
          <div className="grid sm:grid-cols-3 gap-5">
            <Field
              label={`Initial invested cash (${p.draft.currency})`}
              value={input.invested}
              onChange={(v) => set("invested", v)}
            />
            <Field
              label="Ownership at exit"
              value={input.ownership}
              suffix="%"
              onChange={(v) => set("ownership", v)}
            />
            <Field
              label="Holding period"
              value={input.years}
              suffix="years"
              onChange={(v) => set("years", v)}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Ownership at exit must reflect any subsequent dilution. Using the
            current round does not assume that percentage survives future
            rounds.
          </p>
        </Card>
        <Card
          title="Exit scenarios"
          description={`All amounts are ${p.draft.currency} major units.`}
          action={
            <Button
              variant="secondary"
              disabled={input.exits.length >= 20}
              onClick={() =>
                w.update((p) => ({
                  ...p,
                  returns: { ...p.returns, exits: [...p.returns.exits, ""] },
                }))
              }
            >
              <Plus className="size-4" />
              Add exit value
            </Button>
          }
        >
          <div className="grid sm:grid-cols-2 gap-4">
            {input.exits.map((v, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field
                  className="flex-1"
                  label={`Distributable equity proceeds ${i + 1}`}
                  value={v}
                  onChange={(v) =>
                    w.update((p) => {
                      p.returns.exits[i] = v;
                      return p;
                    })
                  }
                />
                <button
                  disabled={input.exits.length === 1}
                  aria-label={`Remove exit ${i + 1}`}
                  className="p-3 text-muted-foreground disabled:opacity-30"
                  onClick={() =>
                    w.update((p) => {
                      p.returns.exits.splice(i, 1);
                      return p;
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
        <Errors errors={r.errors} />
        {r.valid && (
          <Card title="Common-equity outcomes">
            <Table
              label="Investor proceeds and returns"
              headers={[
                "Distributable proceeds",
                "Investor proceeds",
                "Gross MOIC",
                "Annualized return",
              ]}
              rows={r.rows.map((row) => [
                fmt(row.exit, "money"),
                fmt(row.proceeds, "money"),
                fmt(row.moic, "multiple"),
                fmt(row.annualized, "percent"),
              ])}
            />
            <div className="font-mono text-xs text-muted-foreground leading-relaxed mt-5 space-y-2">
              <p>proceeds = ownership × distributable equity proceeds</p>
              <p>MOIC = proceeds / invested cash</p>
              <p>annualized return = MOIC^(1 / years) − 1</p>
            </div>
          </Card>
        )}
        <Card
          title="Agreement-dependent terms are gated"
          action={<LockKeyhole className="size-5 text-primary" />}
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            Preferred waterfalls, SAFE/note conversion and XIRR for multiple
            dated cash flows are unavailable in this release. They require
            contract-defined capitalization, ordering, fixtures and professional
            approval. Unsupported terms are never substituted with generic
            estimates.
          </p>
        </Card>
      </div>
    </>
  );
}
