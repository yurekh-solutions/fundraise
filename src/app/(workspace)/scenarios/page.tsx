"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Pencil,
  Trash2,
  Archive,
  FolderOpen,
  Plus,
  Download,
  Upload,
  Search,
  GitCompareArrows,
  Share2,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import {
  Button,
  Card,
  Confirm,
  Empty,
  ExportButtons,
  Field,
  Modal,
  Notice,
  PageHeader,
  Status,
  Table,
} from "@/components/ui";
import { StorageData, readStorage, Project } from "@/lib/workspace";
import { calculateRound } from "@/lib/engine/round";
import { D } from "@/lib/engine/decimal";
import { format, shortMoney } from "@/lib/format";
import { buildReport } from "@/lib/report";
import { buildShareLink, ShareModal } from "@/components/share-link";
export default function ScenariosPage() {
  const w = useWorkspace(),
    router = useRouter(),
    file = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false),
    [rename, setRename] = useState<string | null>(null),
    [name, setName] = useState(""),
    [remove, setRemove] = useState<string | null>(null),
    [loading, setLoading] = useState<{ id: string; revision: number } | null>(
      null,
    ),
    [backup, setBackup] = useState<StorageData | null>(null),
    [importError, setImportError] = useState("");
  const [share, setShare] = useState<{ url: string; error: string } | null>(
    null,
  );
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
  const scenarios = w.data.scenarios.filter(
    (s) =>
      s.archived === archived &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );
  const selected = w.data.comparison
    .map((id) => w.data.scenarios.find((s) => s.id === id)!)
    .filter(Boolean);
  const date = new Date().toISOString();
  const reports = selected.map((s) => {
    const r = s.revisions.at(-1)!;
    return buildReport(r.project, s.name, `Revision ${r.number}`, date);
  });
  const results = selected.map((s) =>
    calculateRound(s.revisions.at(-1)!.project.draft),
  );
  const mixed = new Set(reports.map((r) => r.currency)).size > 1;
  async function importFile(f: File) {
    setImportError("");
    try {
      if (f.size > 15_000_000) throw new Error("File exceeds 15 MB.");
      setBackup(readStorage(await f.text()));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Invalid backup.");
    }
  }
  const metric = (index: number, key: string) =>
    results[index]?.sections
      .flatMap((s) => s.values)
      .find((v) => v.key === key);
  return (
    <>
      <PageHeader
        eyebrow="Keep your alternatives"
        title="Scenarios, not guesswork."
        description="Save offers, preserve revisions and compare the economics. All scenarios are stored in this browser."
        actions={
          <>
            <Button variant="secondary" onClick={w.backup}>
              <Download className="size-4" />
              JSON backup
            </Button>
            <Button variant="secondary" onClick={() => file.current?.click()}>
              <Upload className="size-4" />
              Import
            </Button>
            <Link
              href="/calculator"
              className="btn-primary px-4 py-2.5 text-sm flex gap-2 items-center"
            >
              <Plus className="size-4" />
              New scenario
            </Link>
          </>
        }
      />
      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) importFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {importError && (
        <div className="mb-5">
          <Notice error>Import rejected: {importError}</Notice>
        </div>
      )}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            aria-label="Search scenarios"
            className="glass-input py-2.5 pl-10 pr-3 w-full text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scenarios…"
          />
        </div>
        <div className="flex bg-secondary rounded-lg p-1 text-xs">
          <button
            className={`px-4 py-2 rounded-md ${!archived ? "bg-white shadow-sm text-primary" : ""}`}
            onClick={() => setArchived(false)}
          >
            Active
          </button>
          <button
            className={`px-4 py-2 rounded-md ${archived ? "bg-white shadow-sm text-primary" : ""}`}
            onClick={() => setArchived(true)}
          >
            Archived
          </button>
        </div>
      </div>
      {!scenarios.length ? (
        <Empty
          title={
            search
              ? "No matching scenarios"
              : archived
                ? "No archived scenarios"
                : "Your first scenario is one calculation away."
          }
          description="Enter an offer in the calculator, give it a name, and choose Save scenario. Then duplicate it to explore an alternative."
          href="/calculator"
        />
      ) : (
        <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-5">
          {scenarios.map((s) => {
            const rev = s.revisions.at(-1)!,
              r = calculateRound(rev.project.draft),
              d = rev.project.draft;
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="size-10 rounded-xl bg-violet-50 text-primary grid place-items-center">
                    <FolderOpen className="size-5" />
                  </div>
                  <Status status={r.canExport ? "valid" : "invalid"} />
                </div>
                <h2 className="text-lg font-semibold mt-4 break-words">
                  {s.name}
                </h2>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {d.currency} · Revision {rev.number} · Engine{" "}
                  {rev.engineVersion}
                </p>
                <div className="grid grid-cols-2 gap-3 py-5 mt-2 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Primary raise
                    </p>
                    <p className="font-semibold mt-1">
                      {r.core
                        ? shortMoney(r.core.investment, d.currency, d.notation)
                        : "Unavailable"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Investor equity
                    </p>
                    <p className="font-semibold mt-1">
                      {format(r.core?.equity ?? null, "percent")}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Last saved {new Date(s.updatedAt).toLocaleString()}
                </p>
                <div className="flex gap-2 flex-wrap mt-4">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setLoading({ id: s.id, revision: rev.number })
                    }
                  >
                    Load
                  </Button>
                  <button
                    onClick={() => w.duplicate(s.id)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    aria-label={`Duplicate ${s.name}`}
                  >
                    <Copy className="size-4" />
                  </button>
                  <button
                    onClick={() => openShare(s.name, rev.project)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    aria-label={`Share ${s.name}`}
                  >
                    <Share2 className="size-4" />
                  </button>
                  <button
                    onClick={() => {
                      setName(s.name);
                      setRename(s.id);
                    }}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    aria-label={`Rename ${s.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => w.archive(s.id)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
                    aria-label={
                      archived ? `Restore ${s.name}` : `Archive ${s.name}`
                    }
                  >
                    <Archive className="size-4" />
                  </button>
                  <button
                    onClick={() => setRemove(s.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600"
                    aria-label={`Delete ${s.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Revision history ({s.revisions.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {s.revisions
                      .slice()
                      .reverse()
                      .map((r) => (
                        <div className="flex justify-between" key={r.id}>
                          <span>
                            v{r.number} ·{" "}
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            className="text-primary"
                            onClick={() =>
                              setLoading({ id: s.id, revision: r.number })
                            }
                          >
                            Load revision
                          </button>
                        </div>
                      ))}
                  </div>
                </details>
                {!archived && (
                  <label className="mt-5 pt-4 border-t border-border flex gap-2 items-center text-xs text-primary">
                    <input
                      type="checkbox"
                      className="accent-primary size-4"
                      checked={w.data.comparison.includes(s.id)}
                      onChange={() => w.compare(s.id)}
                    />
                    Add to comparison
                  </label>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-10">
          <Card
            title={`Compare ${selected.length} scenario${selected.length > 1 ? "s" : ""}`}
            description="Current immutable revisions · Up to three scenarios"
            action={<GitCompareArrows className="size-5 text-primary" />}
          >
            <div className="mb-5">
              <ExportButtons reports={reports} />
            </div>
            {mixed && (
              <div className="mb-5">
                <Notice>
                  Currencies differ. No monetary conversion, summation or
                  differences are calculated.
                </Notice>
              </div>
            )}
            <Table
              label="Scenario comparison"
              headers={["Metric", ...selected.map((s) => s.name)]}
              rows={[
                ...(
                  [
                    "pre",
                    "post",
                    "investment",
                    "equity",
                    "founderAfter",
                    "net",
                    "cashAfter",
                    "runwayAfter",
                    "gap",
                  ] as string[]
                ).map((key) => {
                  const first = metric(0, key);
                  return [
                    first?.label || key,
                    ...selected.map((s, i) => {
                      const v = metric(i, key);
                      return v
                        ? format(
                            v.value,
                            v.kind,
                            s.revisions.at(-1)!.project.draft.currency,
                            s.revisions.at(-1)!.project.draft.notation,
                            v.note,
                          )
                        : "Not provided";
                    }),
                  ];
                }),
                ...(selected.length > 1
                  ? ["equity", "founderAfter"].map((key) => [
                      key === "equity"
                        ? "Investor equity Δ vs. first (pp)"
                        : "Founder retention Δ vs. first (pp)",
                      ...selected.map((_, i) => {
                        const a = metric(0, key)?.value,
                          b = metric(i, key)?.value;
                        return a != null && b != null
                          ? format(D(b).sub(a).mul(100).toFixed(), "pp")
                          : "Unavailable";
                      }),
                    ])
                  : []),
              ]}
            />
          </Card>
        </div>
      )}
      <Modal
        open={rename != null}
        title="Rename scenario"
        onClose={() => setRename(null)}
      >
        <Field label="Scenario name" value={name} onChange={setName} />
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => {
              if (rename && w.rename(rename, name)) setRename(null);
            }}
          >
            Save name
          </Button>
        </div>
      </Modal>
      <Confirm
        open={remove != null}
        title="Permanently delete this scenario?"
        description="All its revisions will be removed and comparison references cleaned. Download a JSON backup first if you may need it later."
        onClose={() => setRemove(null)}
        onConfirm={() => {
          if (remove) w.remove(remove);
        }}
      />
      <Confirm
        open={loading != null}
        title="Load saved revision?"
        description="This replaces the current editable draft across all modules. Save or back up current edits first. Historic revisions remain unchanged."
        onClose={() => setLoading(null)}
        onConfirm={() => {
          if (loading && w.load(loading.id, loading.revision))
            router.push("/calculator");
        }}
      />
      <Modal
        open={backup != null}
        title="Preview JSON import"
        onClose={() => setBackup(null)}
      >
        <p className="text-sm text-muted-foreground mb-4">
          {backup?.scenarios.length} scenarios · schema 2. Imported scenarios
          receive new IDs; current scenarios are retained. Draft-only content is
          not imported.
        </p>
        <div className="max-h-60 overflow-y-auto space-y-2">
          {backup?.scenarios.map((s) => (
            <p key={s.id} className="text-sm p-2 bg-secondary rounded-lg">
              {s.name} · {s.revisions.length} revisions
            </p>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            disabled={!backup?.scenarios.length}
            onClick={() => {
              if (backup && w.importBackup(backup)) setBackup(null);
            }}
          >
            Import selected backup
          </Button>
        </div>
      </Modal>
      <ShareModal
        open={!!share}
        url={share?.url ?? ""}
        error={share?.error ?? ""}
        onClose={() => setShare(null)}
      />
    </>
  );
}
