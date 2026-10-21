"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  Project,
  Revision,
  Scenario,
  StorageData,
  STORAGE_KEY,
  canonicalProject,
  checkConflict,
  emptyStorage,
  readStorage,
  uuid,
} from "@/lib/workspace";
import { calculateRound } from "@/lib/engine/round";
import { ENGINE_VERSION } from "@/lib/engine/decimal";
import { validateName } from "@/lib/engine/parse";
import { download } from "@/lib/report";

type Context = {
  data: StorageData;
  ready: boolean;
  storageStatus: string;
  recovery: string | null;
  message: { text: string; error: boolean } | null;
  update: (fn: (p: Project) => Project) => void;
  notify: (text: string, error?: boolean) => void;
  save: (name: string, update?: boolean) => boolean;
  load: (id: string, revision?: number) => boolean;
  rename: (id: string, name: string) => boolean;
  duplicate: (id: string) => boolean;
  archive: (id: string) => boolean;
  remove: (id: string) => boolean;
  compare: (id: string) => boolean;
  importBackup: (backup: StorageData) => boolean;
  resetStorage: () => void;
  backup: () => void;
};
const Workspace = createContext<Context | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StorageData>(() => ({
    schemaVersion: "2",
    version: "initial",
    draft: {
      company: "",
      draft: {
        currency: "INR",
        notation: "indian",
        solveFor: "equity",
        basis: "pre",
        unit: "units",
        valuation: "",
        investment: "",
        equity: "",
        founder: "100",
        shares: "",
        cash: "",
        burn: "",
        fee: "0",
        fixed: "0",
        target: "18",
        reserve: "0",
        revenue: "",
      },
      ledger: { holdings: [], rounds: [], transfers: [] },
      forecast: {
        months: "24",
        opening: "",
        reserve: "0",
        revenue: "",
        growth: "0",
        cogs: "0",
        opex: "",
        expenseGrowth: "0",
        delay: "0",
        case: "base",
        upsideRevenue: "20",
        upsideExpense: "0",
        downsideRevenue: "-20",
        downsideExpense: "20",
        hires: [],
        funding: [],
        costs: [],
        overrides: [],
        allocations: {
          hiring: "0",
          product: "0",
          marketing: "0",
          operations: "0",
          capex: "0",
          reserve: "0",
        },
      },
      returns: { invested: "", ownership: "", years: "5", exits: [""] },
      sensitivity: {
        minVal: "40000000",
        maxVal: "60000000",
        minRaise: "5000000",
        maxRaise: "15000000",
        points: "5",
        founder: "100",
      },
      enabled: {
        ledger: false,
        forecast: false,
        returns: false,
        sensitivity: false,
      },
    },
    activeId: null,
    scenarios: [],
    comparison: [],
  }));
  const ref = useRef(data),
    expected = useRef<string | null>(null),
    damaged = useRef(false);
  const [ready, setReady] = useState(false),
    [storageStatus, setStatus] = useState("Loading browser data…"),
    [recovery, setRecovery] = useState<string | null>(null);
  const [message, setMessage] = useState<Context["message"]>(null);
  function notify(text: string, error = false) {
    setMessage({ text, error });
  }
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6500);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const stored = readStorage(raw);
          ref.current = stored;
          setData(stored);
          expected.current = stored.version;
          setStatus("Saved in this browser");
        } catch (e) {
          damaged.current = true;
          setRecovery(raw);
          setStatus("Not saved — recovery required");
          notify(
            `Stored data needs recovery: ${e instanceof Error ? e.message : "Invalid data"}`,
            true,
          );
        }
      } else {
        const fresh = emptyStorage();
        ref.current = fresh;
        setData(fresh);
        setStatus("Draft not yet saved");
      }
    } catch {
      setStatus("Not saved — browser storage unavailable");
      notify(
        "Browser storage is unavailable. You can still edit and download a JSON backup.",
        true,
      );
    }
    setReady(true);
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setStatus("Not saved — another tab changed the workspace");
        notify(
          "Another tab changed this workspace. Export your draft, then reload before saving.",
          true,
        );
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  function persist(next: StorageData, draftOnly = false): boolean {
    if (damaged.current) {
      setStatus("Not saved — recovery required");
      if (!draftOnly)
        notify("Recover or explicitly reset stored data before saving.", true);
      return false;
    }
    try {
      checkConflict(localStorage.getItem(STORAGE_KEY), expected.current);
      next.version = uuid();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      expected.current = next.version;
      setStatus("Saved in this browser");
      return true;
    } catch (e) {
      setStatus("Not saved");
      if (!draftOnly)
        notify(
          e instanceof Error
            ? e.message
            : "Storage quota or permission prevented saving. Download a JSON backup.",
          true,
        );
      return false;
    }
  }
  function accept(next: StorageData) {
    ref.current = next;
    setData(next);
  }
  function update(fn: (p: Project) => Project) {
    const next = {
      ...ref.current,
      draft: fn(structuredClone(ref.current.draft)),
    };
    accept(next);
    persist(next, true);
  }
  function commit(next: StorageData, text: string): boolean {
    if (!persist(next)) return false;
    accept(next);
    notify(text);
    return true;
  }
  function save(name: string, updating = false) {
    const error = validateName(name);
    if (error) {
      notify(error, true);
      return false;
    }
    const current = ref.current;
    if (!calculateRound(current.draft.draft).canExport) {
      notify(
        "Complete the round and fix invalid optional assumptions before saving.",
        true,
      );
      return false;
    }
    const now = new Date().toISOString(),
      project = canonicalProject(current.draft);
    const active = updating
      ? current.scenarios.find((s) => s.id === current.activeId)
      : null;
    if (current.scenarios.length >= 200 && !active) {
      notify(
        "Limit reached: 200 scenarios. Export a backup before deleting old scenarios.",
        true,
      );
      return false;
    }
    if (active && active.revisions.length >= 200) {
      notify("Revision limit reached. Save as a new scenario.", true);
      return false;
    }
    const revision: Revision = {
      id: uuid(),
      number: (active?.revisions.length ?? 0) + 1,
      createdAt: now,
      engineVersion: ENGINE_VERSION,
      project,
    };
    const scenario: Scenario = active
      ? {
          ...active,
          name: name.trim(),
          updatedAt: now,
          revisions: [...active.revisions, revision],
        }
      : {
          id: uuid(),
          name: name.trim(),
          archived: false,
          createdAt: now,
          updatedAt: now,
          revisions: [revision],
        };
    return commit(
      {
        ...current,
        activeId: scenario.id,
        scenarios: active
          ? current.scenarios.map((s) => (s.id === active.id ? scenario : s))
          : [...current.scenarios, scenario],
      },
      `${active ? "Revision saved" : "Scenario saved"} in this browser.`,
    );
  }
  function load(id: string, revision?: number) {
    const s = ref.current.scenarios.find((s) => s.id === id);
    if (!s) return false;
    const r =
      s.revisions.find((r) => r.number === revision) ?? s.revisions.at(-1)!;
    return commit(
      { ...ref.current, activeId: id, draft: structuredClone(r.project) },
      `Loaded ${s.name}, revision ${r.number}.`,
    );
  }
  function rename(id: string, name: string) {
    const error = validateName(name);
    if (error) {
      notify(error, true);
      return false;
    }
    return commit(
      {
        ...ref.current,
        scenarios: ref.current.scenarios.map((s) =>
          s.id === id
            ? { ...s, name: name.trim(), updatedAt: new Date().toISOString() }
            : s,
        ),
      },
      "Scenario renamed.",
    );
  }
  function duplicate(id: string) {
    const s = ref.current.scenarios.find((s) => s.id === id);
    if (!s) return false;
    const now = new Date().toISOString();
    if (ref.current.scenarios.length >= 200) {
      notify("Scenario limit reached.", true);
      return false;
    }
    const copy: Scenario = {
      ...s,
      id: uuid(),
      name: `${s.name.slice(0, 112)} (copy)`,
      archived: false,
      createdAt: now,
      updatedAt: now,
      revisions: [
        { ...s.revisions.at(-1)!, id: uuid(), number: 1, createdAt: now },
      ],
    };
    return commit(
      { ...ref.current, scenarios: [...ref.current.scenarios, copy] },
      "Scenario duplicated with a new ID.",
    );
  }
  function archive(id: string) {
    return commit(
      {
        ...ref.current,
        scenarios: ref.current.scenarios.map((s) =>
          s.id === id ? { ...s, archived: !s.archived } : s,
        ),
        comparison: ref.current.comparison.filter((i) => i !== id),
      },
      "Archive status updated.",
    );
  }
  function remove(id: string) {
    return commit(
      {
        ...ref.current,
        scenarios: ref.current.scenarios.filter((s) => s.id !== id),
        comparison: ref.current.comparison.filter((i) => i !== id),
        activeId: ref.current.activeId === id ? null : ref.current.activeId,
      },
      "Scenario permanently deleted.",
    );
  }
  function compare(id: string) {
    const ids = ref.current.comparison;
    if (!ids.includes(id) && ids.length === 3) {
      notify("Compare up to three scenarios.", true);
      return false;
    }
    return commit(
      {
        ...ref.current,
        comparison: ids.includes(id)
          ? ids.filter((i) => i !== id)
          : [...ids, id],
      },
      "Comparison updated.",
    );
  }
  function importBackup(backup: StorageData) {
    const current = ref.current;
    if (current.scenarios.length + backup.scenarios.length > 200) {
      notify("Import exceeds the 200-scenario limit.", true);
      return false;
    }
    const copies = backup.scenarios.map((s) => ({
      ...s,
      id: uuid(),
      revisions: s.revisions.map((r) => ({ ...r, id: uuid() })),
    }));
    return commit(
      { ...current, scenarios: [...current.scenarios, ...copies] },
      `${copies.length} scenarios imported with new IDs. Existing data was retained.`,
    );
  }
  function resetStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      expected.current = null;
      damaged.current = false;
      setRecovery(null);
      const next = emptyStorage();
      if (persist(next)) {
        accept(next);
        notify("Browser workspace reset.");
      }
    } catch {
      notify(
        "Browser storage cannot be reset. Your in-memory draft remains available.",
        true,
      );
    }
  }
  function backup() {
    download(JSON.stringify(ref.current, null, 2), "fundraise-backup.json");
    notify("JSON backup downloaded. Keep it in a secure location.");
  }
  return (
    <Workspace.Provider
      value={{
        data,
        ready,
        storageStatus,
        recovery,
        message,
        update,
        notify,
        save,
        load,
        rename,
        duplicate,
        archive,
        remove,
        compare,
        importBackup,
        resetStorage,
        backup,
      }}
    >
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-xl pointer-events-none"
      >
        {message && (
          <div
            className={`rounded-xl border px-5 py-4 shadow-lg text-sm ${message.error ? "bg-red-50 text-red-800 border-red-200" : "bg-white text-foreground border-primary/20"}`}
          >
            {message.text}
          </div>
        )}
      </div>
    </Workspace.Provider>
  );
}
export function useWorkspace() {
  const c = useContext(Workspace);
  if (!c) throw new Error("Workspace provider missing.");
  return c;
}
