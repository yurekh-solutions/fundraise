"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  Layers3,
  PieChart,
  GitBranch,
  ChartNoAxesCombined,
  TrendingUp,
  Grid2X2,
  FileText,
  BookOpen,
  ArrowUpRight,
  Menu,
  X,
  ShieldCheck,
  Download,
  HardDrive,
  ChevronRight,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Button, Confirm, Notice } from "./ui";
import { download } from "@/lib/report";
const links = [
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/scenarios", label: "Scenarios", icon: Layers3 },
  { href: "/cap-table", label: "Cap table", icon: PieChart },
  { href: "/rounds", label: "Round planner", icon: GitBranch },
  { href: "/forecast", label: "Cash forecast", icon: ChartNoAxesCombined },
  { href: "/returns", label: "Investor outcomes", icon: TrendingUp },
  { href: "/sensitivity", label: "Sensitivity", icon: Grid2X2 },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/guide", label: "Guide & formulas", icon: BookOpen },
];
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    [open, setOpen] = useState(false),
    [reset, setReset] = useState(false);
  const w = useWorkspace(),
    active = w.data.scenarios.find((s) => s.id === w.data.activeId);
  const nav = (
    <>
      <Link href="/" className="brand-logo text-[38px] px-5 pt-7 pb-2 block">
        fundraise<span className="text-primary-glow">.</span>
      </Link>
      <p className="px-6 text-[10px] uppercase tracking-[.22em] text-muted-foreground mb-8">
        The founder’s planning suite
      </p>
      <div className="px-4">
        <p className="text-[10px] font-semibold tracking-[.16em] uppercase text-muted-foreground px-3 mb-3">
          Workspace
        </p>
        <nav aria-label="Application">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={path === l.href ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-3 mb-1 rounded-xl text-sm transition ${path === l.href ? "bg-primary/8 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <l.icon className="size-[18px]" />
              {l.label}
              {path === l.href && (
                <span className="size-1.5 rounded-full bg-primary ml-auto" />
              )}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto px-5 py-5">
        <div className="rounded-2xl bg-violet-50/70 border border-violet-100 p-4">
          <ShieldCheck className="text-primary size-5 mb-2" />
          <p className="text-xs font-semibold">Your numbers stay yours.</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
            Local calculations. No financial inputs sent to a server.
          </p>
          <button
            onClick={w.backup}
            className="text-xs text-primary font-medium flex items-center gap-1 mt-3"
          >
            Download backup <Download className="size-3" />
          </button>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 px-1 mt-5 text-xs text-muted-foreground"
        >
          Back to website <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </>
  );
  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 fixed inset-y-0 left-0 glass-panel z-30">
        {nav}
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black/30"
          onClick={() => setOpen(false)}
        >
          <aside
            className="bg-white w-72 h-full flex flex-col overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              aria-label="Close navigation"
              className="absolute left-60 top-3 p-2"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex-1 min-w-0 lg:ml-60 xl:ml-64">
        <header className="h-18 border-b border-border bg-white/90 backdrop-blur flex items-center justify-between px-4 sm:px-7 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-2"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <span className="hidden sm:block text-sm text-muted-foreground">
              Workspace
            </span>
            <ChevronRight className="hidden sm:block size-3 text-muted-foreground" />
            <span className="text-sm font-medium truncate">
              {active?.name || "Untitled scenario"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`hidden md:flex items-center gap-1.5 text-[11px] ${w.storageStatus.startsWith("Saved") ? "text-muted-foreground" : "text-amber-700"}`}
            >
              <HardDrive className="size-3.5" />
              {w.storageStatus}
            </span>
            <Link
              href="/reports"
              className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
            >
              <FileText className="size-3.5" />
              <span className="hidden sm:inline">Report preview</span>
            </Link>
            <div className="size-8 rounded-full bg-violet-100 text-violet-700 grid place-items-center text-xs font-bold">
              F
            </div>
          </div>
        </header>
        <main
          id="main"
          className="max-w-[1500px] mx-auto p-4 sm:p-7 lg:p-8 pb-20"
        >
          {!w.ready ? (
            <div
              className="animate-pulse glass-card h-64 bg-secondary"
              aria-label="Loading workspace"
            />
          ) : (
            <>
              {w.recovery && (
                <div className="mb-5">
                  <Notice error>
                    Saved data was not overwritten. Download the raw recovery
                    file before explicitly resetting browser storage.
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          download(
                            w.recovery!,
                            "fundraise-recovery.txt",
                            "text/plain",
                          )
                        }
                      >
                        Download recovery file
                      </Button>
                      <Button variant="danger" onClick={() => setReset(true)}>
                        Reset stored data
                      </Button>
                    </div>
                  </Notice>
                </div>
              )}
              {children}
            </>
          )}
        </main>
        <footer className="px-4 sm:px-8 py-5 border-t border-border text-[11px] text-muted-foreground flex flex-wrap gap-3 justify-between">
          <span>Fundraise · Engine 1.0.0 · Planning, not financial advice</span>
          <span>{w.storageStatus}</span>
        </footer>
      </div>
      <Confirm
        open={reset}
        title="Reset browser workspace?"
        description="This permanently removes browser data. Download your recovery file first. This cannot be undone."
        onClose={() => setReset(false)}
        onConfirm={w.resetStorage}
      />
    </div>
  );
}
