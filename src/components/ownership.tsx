"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowDown, ArrowUp, ArrowRight } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import {
  Button,
  Card,
  Confirm,
  Empty,
  EnableSection,
  Errors,
  Field,
  Metric,
  Notice,
  PageHeader,
  Select,
  Table,
} from "./ui";
import {
  Holding,
  LedgerInput,
  LedgerRow,
  PricedEvent,
  calculateLedger,
} from "@/lib/engine/planning";
import { uuid } from "@/lib/workspace";
import { format, shortMoney } from "@/lib/format";
import { D } from "@/lib/engine/decimal";

export function OwnershipPage({ rounds = false }: { rounds?: boolean }) {
  const w = useWorkspace(),
    project = w.data.draft,
    ledger = project.ledger,
    r = calculateLedger(ledger),
    [basic, setBasic] = useState(false),
    [reorder, setReorder] = useState<{ index: number; delta: number } | null>(
      null,
    ),
    [deletion, setDeletion] = useState<(() => void) | null>(null);
  const currency = project.draft.currency,
    notation = project.draft.notation;
  const fmt = (
    value: string | null,
    kind: "money" | "shares" | "percent" | "price",
    note?: string,
  ) => format(value, kind, currency, notation, note);
  const change = (fn: (l: LedgerInput) => void) =>
    w.update((p) => {
      fn(p.ledger);
      return p;
    });
  const newHolding = () =>
    change((l) =>
      l.holdings.push({ id: uuid(), name: "", type: "founder", shares: "" }),
    );
  const newRound = () =>
    change((l) =>
      l.rounds.push({
        id: uuid(),
        name: "",
        date: new Date().toISOString().slice(0, 10),
        valuation: "",
        investors: [{ id: uuid(), name: "", cash: "" }],
        poolTiming: "none",
        poolTarget: "0",
      }),
    );
  const table = (rows: LedgerRow[], title: string) => (
    <Table
      label={title}
      headers={[
        "Stakeholder",
        "Type",
        "Shares",
        basic ? "Basic issued %" : "Fully diluted %",
      ]}
      rows={rows.map((h) => [
        h.name,
        h.type,
        fmt(h.shares, "shares"),
        fmt(basic ? h.basicFraction : h.fraction, "percent", "Not issued"),
      ])}
    />
  );
  return (
    <>
      <PageHeader
        eyebrow={rounds ? "The next chapter" : "Detailed ownership"}
        title={rounds ? "Model every round, in order." : "Know who owns what."}
        description="A share-based ledger with one common-equity price per round. This model is independent from the simple calculator; all amounts use the selected currency’s major units."
        actions={
          <Button
            onClick={rounds ? newRound : newHolding}
            disabled={
              rounds
                ? ledger.rounds.length >= 20
                : ledger.holdings.length >= 100
            }
          >
            <Plus className="size-4" />
            {rounds ? "Add round" : "Add stakeholder"}
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-4 justify-between">
        <EnableSection
          section="detailed ownership"
          enabled={project.enabled.ledger}
          onChange={(v) =>
            w.update((p) => ({ ...p, enabled: { ...p.enabled, ledger: v } }))
          }
        />
        <span className="text-xs text-muted-foreground">
          Currency: {currency} · Fractional planning shares
        </span>
      </div>
      {!ledger.holdings.length && (
        <div className="mb-5">
          <Empty
            title="Start with your existing share ledger."
            description="Add founders, existing shareholders, outstanding awards and unallocated options. Shares, not a manually entered percentage, determine detailed ownership."
            action={<Button onClick={newHolding}>Add first stakeholder</Button>}
          />
        </div>
      )}
      {!rounds && (
        <div className="space-y-5">
          <Card
            title="Starting capitalization"
            description="Awards and unallocated options are separate — never count the same shares twice."
          >
            <div className="space-y-4">
              {ledger.holdings.map((h, i) => (
                <div
                  className="grid sm:grid-cols-[1.3fr_1fr_1fr_auto] gap-3 items-end"
                  key={h.id}
                >
                  <Field
                    label={`Stakeholder ${i + 1} name`}
                    value={h.name}
                    onChange={(v) =>
                      change((l) => {
                        l.holdings[i].name = v;
                      })
                    }
                    placeholder="Name"
                  />
                  <Select
                    label="Holding type"
                    value={h.type}
                    onChange={(v) =>
                      change((l) => {
                        l.holdings[i].type = v as Holding["type"];
                      })
                    }
                    options={[
                      { value: "founder", label: "Founder · issued" },
                      { value: "holder", label: "Shareholder · issued" },
                      { value: "award", label: "Outstanding award" },
                      { value: "pool", label: "Unallocated pool" },
                    ]}
                  />
                  <Field
                    label="Share quantity"
                    value={h.shares}
                    onChange={(v) =>
                      change((l) => {
                        l.holdings[i].shares = v;
                      })
                    }
                  />
                  <button
                    aria-label={`Remove stakeholder ${i + 1}`}
                    className="p-3 text-muted-foreground hover:text-red-600"
                    onClick={() =>
                      setDeletion(
                        () => () =>
                          change((l) => {
                            l.holdings.splice(i, 1);
                            l.transfers = l.transfers.filter(
                              (t) => t.seller !== h.id && t.buyer !== h.id,
                            );
                          }),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            {ledger.holdings.length > 0 && (
              <div className="mt-5">
                <Button
                  variant="secondary"
                  onClick={newHolding}
                  disabled={ledger.holdings.length >= 100}
                >
                  <Plus className="size-4" />
                  Add stakeholder
                </Button>
              </div>
            )}
          </Card>
          <Card
            title="Secondary transfers"
            description="Transfer issued shares between existing holders before funding rounds. Secondary proceeds belong to the seller, not the company."
            action={
              <Button
                variant="secondary"
                disabled={ledger.holdings.length < 2}
                onClick={() =>
                  change((l) =>
                    l.transfers.push({
                      id: uuid(),
                      seller: l.holdings[0].id,
                      buyer: l.holdings[1].id,
                      shares: "",
                      price: "",
                      fees: "0",
                    }),
                  )
                }
              >
                <Plus className="size-4" />
                Add
              </Button>
            }
          >
            <div className="space-y-4">
              {ledger.transfers.map((t, i) => (
                <div
                  key={t.id}
                  className="grid sm:grid-cols-3 xl:grid-cols-6 gap-3 items-end"
                >
                  <Select
                    label="Seller"
                    value={t.seller}
                    onChange={(v) =>
                      change((l) => {
                        l.transfers[i].seller = v;
                      })
                    }
                    options={ledger.holdings
                      .filter((h) => h.type !== "award" && h.type !== "pool")
                      .map((h) => ({
                        value: h.id,
                        label: h.name || "Unnamed holder",
                      }))}
                  />
                  <Select
                    label="Buyer"
                    value={t.buyer}
                    onChange={(v) =>
                      change((l) => {
                        l.transfers[i].buyer = v;
                      })
                    }
                    options={ledger.holdings
                      .filter((h) => h.type !== "award" && h.type !== "pool")
                      .map((h) => ({
                        value: h.id,
                        label: h.name || "Unnamed holder",
                      }))}
                  />
                  {(["shares", "price", "fees"] as const).map((k) => (
                    <Field
                      key={k}
                      label={
                        k === "price"
                          ? "Price / share"
                          : k === "fees"
                            ? "Seller fees"
                            : "Transfer shares"
                      }
                      value={t[k]}
                      onChange={(v) =>
                        change((l) => {
                          l.transfers[i][k] = v;
                        })
                      }
                    />
                  ))}
                  <button
                    aria-label="Remove transfer"
                    onClick={() =>
                      change((l) => {
                        l.transfers.splice(i, 1);
                      })
                    }
                    className="p-3 text-red-600"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
            {!ledger.transfers.length && (
              <p className="text-sm text-muted-foreground">
                No secondary transfers. Company cash is unaffected by these
                transactions.
              </p>
            )}
          </Card>
        </div>
      )}
      {rounds && (
        <div className="space-y-5">
          {!ledger.rounds.length && (
            <Empty
              title="Plan your first priced round."
              description="Enter starting stakeholders in the cap table, then add investors, a pre-money valuation and optional pool timing."
              action={<Button onClick={newRound}>Add first round</Button>}
            />
          )}
          {ledger.rounds.map((event, i) => (
            <Card
              key={event.id}
              title={`Round ${i + 1}`}
              action={
                <div className="flex gap-1">
                  <button
                    aria-label="Move round earlier"
                    disabled={i === 0}
                    className="p-2 disabled:opacity-30"
                    onClick={() => setReorder({ index: i, delta: -1 })}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    aria-label="Move round later"
                    disabled={i === ledger.rounds.length - 1}
                    className="p-2 disabled:opacity-30"
                    onClick={() => setReorder({ index: i, delta: 1 })}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    aria-label="Remove round"
                    className="p-2 text-red-600"
                    onClick={() =>
                      setDeletion(
                        () => () =>
                          change((l) => {
                            l.rounds.splice(i, 1);
                          }),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              }
            >
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <Field
                  label="Round name"
                  value={event.name}
                  placeholder="e.g. Seed"
                  onChange={(v) =>
                    change((l) => {
                      l.rounds[i].name = v;
                    })
                  }
                />
                <Field
                  label="Round date"
                  type="date"
                  value={event.date}
                  onChange={(v) =>
                    change((l) => {
                      l.rounds[i].date = v;
                    })
                  }
                />
                <Field
                  label={`Pre-money valuation (${currency})`}
                  value={event.valuation}
                  onChange={(v) =>
                    change((l) => {
                      l.rounds[i].valuation = v;
                    })
                  }
                />
                <Select
                  label="Pool top-up timing"
                  value={event.poolTiming}
                  onChange={(v) =>
                    change((l) => {
                      l.rounds[i].poolTiming = v as PricedEvent["poolTiming"];
                    })
                  }
                  options={[
                    { value: "none", label: "No new pool" },
                    {
                      value: "pre",
                      label: "Pre-money · legacy owners bear top-up",
                    },
                    {
                      value: "post",
                      label: "Post-money · all holders diluted",
                    },
                  ]}
                />
                {event.poolTiming !== "none" && (
                  <Field
                    label="Post-round unallocated pool target"
                    suffix="%"
                    value={event.poolTarget}
                    onChange={(v) =>
                      change((l) => {
                        l.rounds[i].poolTarget = v;
                      })
                    }
                  />
                )}
              </div>
              <div className="border-t border-border mt-6 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Primary investors · Same price & common rights
                </p>
                <div className="space-y-3">
                  {event.investors.map((inv, j) => (
                    <div
                      key={inv.id}
                      className="grid sm:grid-cols-[1.3fr_1fr_auto] items-end gap-3"
                    >
                      <Field
                        label="Investor name"
                        value={inv.name}
                        placeholder="Name"
                        onChange={(v) =>
                          change((l) => {
                            l.rounds[i].investors[j].name = v;
                          })
                        }
                      />
                      <Field
                        label={`Primary cash (${currency})`}
                        value={inv.cash}
                        onChange={(v) =>
                          change((l) => {
                            l.rounds[i].investors[j].cash = v;
                          })
                        }
                      />
                      <button
                        aria-label="Remove investor"
                        className="p-3 text-muted-foreground"
                        onClick={() =>
                          change((l) => {
                            l.rounds[i].investors.splice(j, 1);
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      change((l) =>
                        l.rounds[i].investors.push({
                          id: uuid(),
                          name: "",
                          cash: "",
                        }),
                      )
                    }
                    disabled={event.investors.length >= 100}
                  >
                    <Plus className="size-4" />
                    Add investor
                  </Button>
                </div>
              </div>
              {event.poolTiming === "post" && (
                <div className="mt-5">
                  <Notice>
                    Post-money pool creation is a second stage: it dilutes the
                    newly issued investor shares too. Final investor ownership
                    is lower than the simple round percentage.
                  </Notice>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <div className="mt-6 space-y-5">
        {ledger.holdings.length > 0 && <Errors errors={r.errors} />}
        {r.valid && (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <Metric
                label="Total fully diluted shares"
                value={fmt(r.total, "shares")}
              />
              <Metric
                label="Primary cash across rounds"
                value={shortMoney(
                  r.snapshots
                    .reduce((s, v) => s.add(v.investment), D(0))
                    .toFixed(),
                  currency,
                  notation,
                )}
                note="Gross company financing, not secondary sales"
              />
              <Metric
                label="Secondary seller proceeds"
                value={shortMoney(r.secondaryNet, currency, notation)}
                note="Net seller proceeds · No company cash"
              />
            </div>
            <Card
              title="Ownership ledger"
              action={
                <label className="text-xs flex gap-2">
                  <input
                    type="checkbox"
                    checked={basic}
                    onChange={(e) => setBasic(e.target.checked)}
                    className="accent-primary"
                  />
                  Basic issued view
                </label>
              }
            >
              {table(r.rows, "Final ownership ledger")}
              <p className="text-[11px] text-muted-foreground mt-4">
                Displayed totals may differ due to rounding. Fully diluted
                includes awards and unallocated pool; vesting itself does not
                reduce the denominator.
              </p>
            </Card>
            {rounds &&
              r.snapshots.map((s) => (
                <Card
                  key={s.id}
                  title={`${s.name} · ${s.date}`}
                  description={`Price: ${fmt(s.price, "price")} · Investor aggregate: ${fmt(s.investorFraction, "percent")} · Pool added: ${fmt(s.poolAdded, "shares")}`}
                >
                  {table(s.rows, `Ownership after ${s.name}`)}
                </Card>
              ))}
          </>
        )}
        <Notice>
          Save these inputs as a scenario revision from the calculator.{" "}
          <Link className="underline" href={rounds ? "/cap-table" : "/rounds"}>
            {rounds ? "Edit starting cap table" : "Continue to round planner"}
          </Link>
          .
        </Notice>
      </div>
      <Confirm
        open={reorder != null}
        title="Reorder funding events?"
        description="Every downstream round will be recalculated immediately from the new order. This can change price, pool top-ups and all ownership percentages. Saved revisions remain unchanged."
        onClose={() => setReorder(null)}
        onConfirm={() => {
          if (reorder)
            change((l) => {
              const j = reorder.index + reorder.delta;
              [l.rounds[reorder.index], l.rounds[j]] = [
                l.rounds[j],
                l.rounds[reorder.index],
              ];
            });
        }}
      />
      <Confirm
        open={deletion != null}
        title="Remove this ledger entry?"
        description="Dependent results will recalculate. Removing a stakeholder also removes their secondary transfers. Saved revisions are retained."
        onClose={() => setDeletion(null)}
        onConfirm={() => deletion?.()}
      />
    </>
  );
}
