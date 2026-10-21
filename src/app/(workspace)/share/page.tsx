"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { Button, Card, Notice, PageHeader, Status } from "@/components/ui";
import { SharePayload, decodeShare } from "@/lib/share";
import { calculateRound } from "@/lib/engine/round";
import type { ValueKind } from "@/lib/engine/types";
import { format, shortMoney } from "@/lib/format";

export default function SharePage() {
  const w = useWorkspace(),
    router = useRouter();
  const [payload, setPayload] = useState<SharePayload | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#p=")) {
      setError("No shared scenario data was found in this link.");
      return;
    }
    try {
      setPayload(decodeShare(hash.slice(3)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid share link.");
    }
  }, []);
  const r = payload ? calculateRound(payload.project.draft) : null;
  const open = () => {
    if (!payload) return;
    w.update(() => structuredClone(payload.project));
    w.notify(`“${payload.name}” loaded into your calculator draft.`);
    router.push("/calculator");
  };
  return (
    <>
      <PageHeader
        eyebrow="Shared with you"
        title={
          payload ? payload.name : error ? "Share link problem" : "Decoding…"
        }
        description={
          error
            ? "The link could not be decoded in this browser."
            : payload
              ? "A read-only summary of a shared fundraising scenario."
              : "Reading the scenario from the link fragment…"
        }
      />
      {error && <Notice error>{error}</Notice>}
      {payload && r && (
        <div className="space-y-5 max-w-3xl">
          <Notice>
            This summary was decoded from the link inside your browser —{" "}
            <ShieldCheck className="inline size-4 text-primary" /> nothing was
            uploaded to any server, and nothing is saved here until you choose
            to open it.
          </Notice>
          <Card
            title="Round summary"
            description={`Currency ${payload.project.draft.currency} · Read-only`}
            action={<Status status={r.canExport ? "valid" : "invalid"} />}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              {(
                [
                  ["Pre-money valuation", r.core?.pre, "money"],
                  ["Post-money valuation", r.core?.post, "money"],
                  ["Gross primary investment", r.core?.investment, "money"],
                  ["New investor ownership", r.core?.equity, "percent"],
                ] as [string, string | null, ValueKind][]
              ).map(([label, value, kind]) => (
                <div key={label} className="glass-card-subtle p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold mt-1 tabular-nums">
                    {format(
                      value,
                      kind,
                      payload.project.draft.currency,
                      payload.project.draft.notation,
                    )}
                  </p>
                </div>
              ))}
            </div>
            {r.sections
              .filter((s) => s.id !== "core")
              .flatMap((s) => s.values)
              .some((v) => v.key === "founderAfter") && (
              <p className="text-sm text-muted-foreground mt-4">
                Founder retention after the round:{" "}
                <span className="font-semibold text-foreground">
                  {format(
                    r.sections
                      .flatMap((s) => s.values)
                      .find((v) => v.key === "founderAfter")?.value ?? null,
                    "percent",
                  )}
                </span>
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-4">
              Post-money equity value:{" "}
              {r.core
                ? shortMoney(
                    r.core.post,
                    payload.project.draft.currency,
                    payload.project.draft.notation,
                  )
                : "Not provided"}
            </p>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={open}>
              Open in my calculator
              <ArrowRight className="size-4" />
            </Button>
            <Link
              href="/scenarios"
              className="btn-secondary px-4 py-2.5 text-sm inline-flex items-center"
            >
              My scenarios
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Opening copies the shared scenario into your editable draft in this
            browser. Nothing changes until you save it as your own scenario.
          </p>
        </div>
      )}
    </>
  );
}
