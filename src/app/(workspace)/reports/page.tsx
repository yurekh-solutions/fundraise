"use client";
import { useState } from "react";
import { useWorkspace } from "@/components/workspace-provider";
import {
  Card,
  ExportButtons,
  Field,
  Notice,
  PageHeader,
  Select,
  Status,
  Table,
  Button,
} from "@/components/ui";
import { buildReport, download } from "@/lib/report";
export default function ReportsPage() {
  const w = useWorkspace(),
    [source, setSource] = useState("draft"),
    [excluded, setExcluded] = useState<string[]>([]);
  const [reportDate] = useState(() => new Date().toISOString());
  const [scenarioId, revisionNumber] = source.split(":");
  const scenario = w.data.scenarios.find((s) => s.id === scenarioId),
    revision = scenario?.revisions.find(
      (r) => r.number === Number(revisionNumber),
    );
  const project = revision?.project ?? w.data.draft;
  const full = buildReport(
    project,
    scenario?.name || "Untitled scenario",
    revision ? `Revision ${revision.number}` : "Unsaved draft",
    reportDate,
  );
  const report = buildReport(
    project,
    full.name,
    full.revision,
    reportDate,
    full.sections.filter((s) => !excluded.includes(s.id)).map((s) => s.id),
  );
  return (
    <>
      <PageHeader
        eyebrow="Ready for the conversation"
        title="A clear, reproducible report."
        description="Preview the exact dataset used by PDF and CSV. Saved revisions are immutable; draft reports are visibly labeled unsaved."
        actions={<ExportButtons reports={[report]} />}
      />
      <div className="grid xl:grid-cols-[260px_1fr] gap-6 items-start">
        <div className="space-y-5">
          <Card title="Report source">
            <Select
              label="Scenario revision"
              value={source}
              onChange={(v) => {
                setSource(v);
                setExcluded([]);
              }}
              options={[
                { value: "draft", label: "Current unsaved draft" },
                ...w.data.scenarios.flatMap((s) =>
                  s.revisions.map((r) => ({
                    value: `${s.id}:${r.number}`,
                    label: `${s.name} · v${r.number}`,
                  })),
                ),
              ]}
            />
            {!revision && (
              <div className="mt-4">
                <Field
                  label="Company name"
                  value={project.company}
                  placeholder="Optional company name"
                  onChange={(v) =>
                    w.update((p) => ({ ...p, company: v.slice(0, 120) }))
                  }
                />
              </div>
            )}
          </Card>
          <Card title="Included sections">
            <div className="space-y-3">
              {full.sections.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    disabled={s.id === "core" || s.id === "inputs"}
                    checked={!excluded.includes(s.id)}
                    onChange={(e) =>
                      setExcluded(
                        e.target.checked
                          ? excluded.filter((id) => id !== s.id)
                          : [...excluded, s.id],
                      )
                    }
                  />
                  {s.title}
                </label>
              ))}
            </div>
          </Card>
          <Card title="JSON backup">
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Lossless local workspace backup, including decimal strings,
              revisions and editable module assumptions. Import with preview
              from Scenarios.
            </p>
            <Button variant="secondary" onClick={w.backup}>
              Download JSON backup
            </Button>
          </Card>
        </div>
        <div className="space-y-5 min-w-0">
          {report.blocked && (
            <Notice error>
              Export blocked: complete the core round and fix all invalid
              enabled sections. Removing an invalid section from the preview
              does not certify its assumptions.
            </Notice>
          )}
          <section className="purple-panel rounded-2xl p-7 sm:p-9">
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[.2em] text-violet-200">
                Fundraise · Planning report
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold mt-5 break-words">
                {report.name}
              </h2>
              <p className="text-sm text-violet-200 mt-3 break-words">
                {report.company}
              </p>
              <div className="flex flex-wrap gap-5 text-[11px] text-violet-200 mt-7 pt-5 border-t border-white/15">
                <span>{report.currency}</span>
                <span>{report.revision}</span>
                <span>Engine {report.engineVersion}</span>
                <span>{new Date(report.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </section>
          {report.sections.map((s) => (
            <Card
              key={s.id}
              title={s.title}
              action={<Status status={s.status} />}
            >
              {s.rows.length > 0 && (
                <Table
                  label={s.title}
                  headers={["Metric", "Value / units", "Provenance", "Status"]}
                  rows={s.rows.map((v) => [
                    v.label,
                    v.display,
                    v.provenance,
                    v.status,
                  ])}
                />
              )}
              {s.tables.map((t, i) => (
                <div key={i} className="mt-5">
                  <h3 className="text-sm font-medium mb-3 break-words">
                    {t.title}
                  </h3>
                  <Table label={t.title} headers={t.headers} rows={t.rows} />
                </div>
              ))}
              {s.formulas.length > 0 && (
                <details className="text-xs text-muted-foreground mt-4">
                  <summary className="cursor-pointer text-primary">
                    Formulas & assumptions
                  </summary>
                  <div className="mt-3 space-y-2 leading-relaxed">
                    {s.formulas.map((f, i) => (
                      <p key={i}>{f}</p>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          ))}
          <Card title="Omissions, assumptions & exclusions">
            <ul className="text-xs text-muted-foreground leading-relaxed space-y-3">
              {report.warnings.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
