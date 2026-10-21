"use client";
import Link from "next/link";
import { useState } from "react";
import { site } from "@/lib/site";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  PieChart,
  GitBranch,
  ChartNoAxesCombined,
  TrendingUp,
  FileText,
  Layers3,
  Grid2X2,
  ShieldCheck,
  Zap,
  Check,
  Menu,
  X,
  ChevronDown,
  LockKeyhole,
  CheckCheck,
  BookOpen,
  Sigma,
  Scale,
  Target,
  Users,
  FileCheck2,
  WifiOff,
} from "lucide-react";
const stages = [
  {
    kicker: "Step 01 · Model",
    title: "Frame the offer",
    headline: "Model the offer on your terms.",
    detail:
      "Solve valuation, investment or equity on the pre- or post-money basis — then see every stakeholder’s issued and fully diluted stake.",
    links: [
      {
        name: "Round calculator",
        hint: "Any two solve the round",
        href: "/calculator",
        icon: Calculator,
      },
      {
        name: "Cap table",
        hint: "Issued vs fully diluted",
        href: "/cap-table",
        icon: PieChart,
      },
    ],
  },
  {
    kicker: "Step 02 · Plan",
    title: "Shape the rounds",
    headline: "Plan the money around the milestones.",
    detail:
      "Layer successive priced rounds and option pools, then follow cash month by month — hiring, collections and funding dates included.",
    links: [
      {
        name: "Round planner",
        hint: "Rounds and option pools",
        href: "/rounds",
        icon: GitBranch,
      },
      {
        name: "Cash forecast",
        hint: "Month-by-month runway",
        href: "/forecast",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    kicker: "Step 03 · Pressure-test",
    title: "Test the outcomes",
    headline: "Stress-test every term on the table.",
    detail:
      "Sweep valuation and raise size across a sensitivity grid, and translate exit values into gross MOIC and annualized returns.",
    links: [
      {
        name: "Sensitivity analysis",
        hint: "Valuation × raise sweeps",
        href: "/sensitivity",
        icon: Grid2X2,
      },
      {
        name: "Investor outcomes",
        hint: "Proceeds · MOIC · annualized",
        href: "/returns",
        icon: TrendingUp,
      },
    ],
  },
  {
    kicker: "Step 04 · Decide",
    title: "Compare & share",
    headline: "Walk into the room with one report.",
    detail:
      "Keep every alternative versioned, compare up to three offers side by side, and share the same numbers as PDF, CSV or a lossless JSON backup.",
    links: [
      {
        name: "Scenario comparison",
        hint: "Three offers side by side",
        href: "/scenarios",
        icon: Layers3,
      },
      {
        name: "Reports & exports",
        hint: "PDF · CSV · JSON backup",
        href: "/reports",
        icon: FileText,
      },
    ],
  },
];
const faqs = [
  [
    "Do I need an account to calculate?",
    "No. The calculator and planning tools run in your browser without sign-in. Saved scenarios stay in this browser. Download a JSON backup to keep a separate copy.",
  ],
  [
    "What is the difference between pre-money and post-money?",
    "Pre-money is the equity valuation before primary investment. Post-money is pre-money plus the primary cash invested in the company. Secondary proceeds do not increase company post-money valuation.",
  ],
  [
    "Does Fundraise support SAFEs or convertible notes?",
    "Not in this release. These instruments depend on agreement-specific definitions and professional review. The app supports primary priced rounds with common-equity economics; it never estimates unsupported terms silently.",
  ],
  [
    "Can I compare offers in different currencies?",
    "Yes, with a visible warning. Fundraise does not convert currencies, sum unlike amounts or calculate monetary differences across currencies.",
  ],
  [
    "Is this an official cap table or financial advice?",
    "No. Fundraise is a transparent planning tool, not a statutory share register, legal document or recommendation. Review decisions with qualified financial and legal advisers.",
  ],
  [
    "Who is Fundraise built for?",
    "Founders and cofounders planning a priced round, finance advisers preparing client scenarios, and investors who want transparent assumptions instead of a black-box number.",
  ],
  [
    "How is this different from a spreadsheet?",
    "A spreadsheet breaks silently — one wrong cell changes every number. Fundraise recalculates with 40-digit decimal precision, refuses invalid inputs, and shows the formula behind every result.",
  ],
  [
    "Does Fundraise work offline?",
    "Yes. After the first visit, the app is cached in your browser and keeps working without a connection. Your data stays stored locally the whole time.",
  ],
];
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: site.name,
      url: site.url,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      inLanguage: "en",
      description: site.description,
      featureList: [
        "Pre- and post-money round calculator",
        "Cap table with basic and fully diluted ownership",
        "Option pool planning",
        "Monthly cash runway forecast",
        "Scenario comparison",
        "Sensitivity analysis",
        "PDF, CSV and JSON reports",
        "Local-first: data stays in the browser",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};
export default function Landing() {
  const [menu, setMenu] = useState(false),
    [stage, setStage] = useState(0);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-violet-50">
        <div className="max-w-[1360px] mx-auto h-22 flex items-center justify-between px-5 sm:px-8">
          <Link href="/" className="brand-logo text-[40px] sm:text-[45px]">
            fundraise<span className="text-violet-500">.</span>
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden lg:flex gap-9 text-sm text-zinc-600"
          >
            <a href="#how-it-works" className="hover:text-primary">
              How it works
            </a>
            <a href="#modules" className="hover:text-primary">
              Modules
            </a>
            <a href="#why-fundraise" className="hover:text-primary">
              Why Fundraise
            </a>
            <a href="#faq" className="hover:text-primary">
              FAQs
            </a>
          </nav>
          <div className="flex gap-5 items-center">
            <Link
              href="/guide"
              className="hidden md:block text-sm text-zinc-600"
            >
              Explore the guide
            </Link>
            <Link
              href="/calculator"
              className="btn-brand rounded-full px-5 sm:px-6 py-3 text-sm"
            >
              Get Started <ArrowUpRight className="inline size-4 ml-1" />
            </Link>
            <button
              aria-label={menu ? "Close menu" : "Open menu"}
              className="lg:hidden"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav
            aria-label="Mobile navigation"
            className="lg:hidden border-t border-border px-6 py-5 grid gap-4 text-sm"
          >
            {["How it works", "Modules", "Why Fundraise", "FAQ"].map((v, i) => (
              <a
                key={v}
                onClick={() => setMenu(false)}
                href={
                  ["#how-it-works", "#modules", "#why-fundraise", "#faq"][i]
                }
              >
                {v}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main id="main">
        <section className="hero-wash relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(#ddd6fe .8px, transparent .8px)",
              backgroundSize: "25px 25px",
              maskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 grid lg:grid-cols-[1.1fr_1fr] gap-4 items-center pt-16 pb-14 lg:pt-22 lg:pb-24 relative">
            <div className="fade-up">
              <a
                href="#modules"
                className="inline-flex items-center gap-2.5 rounded-full bg-violet-50 border border-violet-200 py-1.5 pl-1.5 pr-4 text-[12px] sm:text-sm text-violet-700"
              >
                <span className="rounded-full bg-violet-800 text-white py-1 px-3 text-[10px] font-bold tracking-wide">
                  FOR FOUNDERS
                </span>{" "}
                Your next raise, clearly modeled{" "}
                <ArrowRight className="size-3.5" />
              </a>
              <h1 className="text-[42px] sm:text-[56px] xl:text-[64px] font-semibold tracking-[-.045em] leading-[1.16] mt-7 max-w-[680px]">
                Know your numbers.
                <br />
                Own your <span className="gradient-text">next move.</span>
              </h1>
              <p className="text-base sm:text-lg text-zinc-500 leading-[1.8] max-w-[510px] mt-7">
                Valuation, equity, runway and investor outcomes —
                <br className="hidden xl:block" /> connected in one transparent
                planning suite.
                <br className="hidden xl:block" /> Built for the decisions
                behind your next raise.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  href="/calculator"
                  className="btn-brand rounded-full inline-flex items-center gap-3 px-7 py-4 text-sm"
                >
                  Plan your raise <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/calculator?example=1"
                  className="rounded-full border border-zinc-200 bg-white inline-flex items-center gap-2 px-6 py-4 text-sm hover:border-violet-300"
                >
                  Try a worked example{" "}
                  <ArrowUpRight className="size-4 text-violet-600" />
                </Link>
              </div>
              <p className="text-xs text-zinc-400 mt-3.5 flex items-center gap-1.5">
                <Check className="size-3.5 text-violet-600" />
                No account required. Your data stays in your browser.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-10 sm:mt-12 max-w-[565px]">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Private by design",
                    desc: "Your data, your control",
                  },
                  {
                    icon: Zap,
                    title: "Instant clarity",
                    desc: "Every formula explained",
                  },
                  {
                    icon: CheckCheck,
                    title: "Built to reconcile",
                    desc: "Precision you can inspect",
                  },
                ].map((t) => (
                  <div
                    key={t.title}
                    className="flex flex-col sm:flex-row items-start gap-2.5"
                  >
                    <div className="size-10 sm:size-11 rounded-xl bg-violet-50/90 border border-violet-100 text-violet-700 grid place-items-center shrink-0">
                      <t.icon className="size-[18px]" />
                    </div>
                    <div className="pt-1">
                      <p className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">
                        {t.title}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">
                        {t.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative w-full max-w-[560px] mx-auto lg:mx-0 mt-12 lg:mt-0 fade-up [animation-delay:.15s]">
              <div
                className="absolute -top-14 -right-12 size-72 rounded-full bg-violet-300/30 blur-3xl"
                aria-hidden
              />
              <div
                className="absolute -bottom-16 -left-16 size-64 rounded-full bg-fuchsia-200/40 blur-3xl"
                aria-hidden
              />
              <Link
                href="/calculator?example=1"
                aria-label="Open the worked example in the calculator"
                className="group relative block rounded-3xl border border-violet-100 bg-white/85 backdrop-blur p-5 sm:p-6 shadow-[0_30px_70px_-28px_rgba(76,29,149,.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_40px_80px_-28px_rgba(76,29,149,.42)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-zinc-400">
                    Calculator · Worked example
                  </span>
                  <span className="status-success rounded-full px-2.5 py-1 text-[10px] font-semibold">
                    Valid inputs
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <div className="glass-card-subtle rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground">
                      Pre-money valuation
                    </p>
                    <p className="text-sm sm:text-base font-semibold mt-1 tabular-nums">
                      ₹5,00,00,000
                    </p>
                  </div>
                  <div className="glass-card-subtle rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground">
                      Primary investment
                    </p>
                    <p className="text-sm sm:text-base font-semibold mt-1 tabular-nums">
                      ₹1,00,00,000
                    </p>
                  </div>
                </div>
                <div className="purple-panel rounded-2xl p-4 sm:p-5 mt-2.5">
                  <p className="text-[10px] uppercase tracking-[.16em] text-violet-200">
                    New investor ownership
                  </p>
                  <p className="text-4xl sm:text-[42px] font-semibold tracking-tight mt-1.5">
                    16.6667%
                  </p>
                  <p className="text-[10px] sm:text-xs text-violet-200/80 mt-2 font-mono">
                    = ₹1,00,00,000 ÷ ₹6,00,00,000 post-money
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                  <div className="rounded-xl border border-violet-100 p-3">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                      Founder after
                    </p>
                    <p className="text-xs sm:text-sm font-semibold mt-1 tabular-nums">
                      50.0000%
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet-100 p-3">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                      Net cash in bank
                    </p>
                    <p className="text-xs sm:text-sm font-semibold mt-1 tabular-nums">
                      ₹98,00,000
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet-100 p-3">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                      Runway after
                    </p>
                    <p className="text-xs sm:text-sm font-semibold mt-1 tabular-nums">
                      11.8 mo
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-[11px] text-muted-foreground">
                  <span>Every value shows its formula</span>
                  <span className="text-violet-700 font-semibold inline-flex items-center gap-1">
                    Open the calculator{" "}
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
              <div className="relative z-10 -mt-5 ml-3 flex flex-wrap items-center gap-2.5">
                <div className="float-soft flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-[0_16px_40px_-18px_rgba(76,29,149,.3)]">
                  <span className="size-9 rounded-xl bg-violet-50 border border-violet-100 text-violet-700 grid place-items-center shrink-0">
                    <Sigma className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Formula trace</p>
                    <p className="text-[10px] text-muted-foreground">
                      Every step explained
                    </p>
                  </div>
                </div>
                <div
                  className="float-soft flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-[0_16px_40px_-18px_rgba(76,29,149,.3)]"
                  style={{ animationDelay: "1.6s" }}
                >
                  <span className="size-9 rounded-xl bg-violet-50 border border-violet-100 text-violet-700 grid place-items-center shrink-0">
                    <Layers3 className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Versioned scenarios</p>
                    <p className="text-[10px] text-muted-foreground">
                      Compare offer A vs B
                    </p>
                  </div>
                </div>
                <div
                  className="float-soft flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-[0_16px_40px_-18px_rgba(76,29,149,.3)]"
                  style={{ animationDelay: "2.6s" }}
                >
                  <span className="size-9 rounded-xl bg-violet-50 border border-violet-100 text-violet-700 grid place-items-center shrink-0">
                    <WifiOff className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold">Works offline</p>
                    <p className="text-[10px] text-muted-foreground">
                      Cached in your browser
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-border bg-zinc-50/60">
          <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[11px] sm:text-xs text-zinc-500">
            <span className="font-semibold text-zinc-800">
              Made for the whole fundraising conversation
            </span>
            <span>Founders & cofounders</span>
            <span>Finance advisers</span>
            <span>Investor discussions</span>
            <span>Board planning</span>
          </div>
        </section>
        <section
          id="how-it-works"
          className="max-w-[1280px] mx-auto px-6 sm:px-8 py-20 lg:py-24"
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-[.18em] font-semibold text-violet-700">
              From offer to understanding
            </p>
            <h2 className="text-3xl sm:text-[40px] font-semibold tracking-tight mt-3">
              Less spreadsheet guessing.
              <br className="sm:hidden" /> More decision clarity.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-4">
              Three steps to see the economics, not just the headline valuation.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              {
                n: "01",
                title: "Start with what you know",
                desc: "Enter any two of valuation, investment and investor equity. Choose the pre- or post-money basis.",
              },
              {
                n: "02",
                title: "See the full picture",
                desc: "Trace founder dilution, usable cash, runway and share issuance. Every result shows its formula.",
              },
              {
                n: "03",
                title: "Compare. Save. Move forward.",
                desc: "Keep alternatives as versioned scenarios and export a clear report for your next conversation.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="relative p-7 rounded-2xl border border-violet-100 bg-white"
              >
                <span className="text-xs font-bold text-violet-600 bg-violet-50 size-9 rounded-full grid place-items-center">
                  {s.n}
                </span>
                <h3 className="text-lg font-semibold mt-5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
        <section
          id="modules"
          className="bg-gradient-to-b from-white via-violet-50/50 to-white border-y border-violet-50"
        >
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-20">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[.18em] font-semibold text-violet-700">
                  One connected planning suite
                </p>
                <h2 className="text-3xl sm:text-[40px] font-semibold tracking-tight mt-3">
                  Eight modules.
                  <br />
                  One continuous thread.
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm lg:text-right lg:pb-2">
                Enter a number once — the calculator, ledger, forecast and
                reports all read the same inputs. Follow the thread from first
                estimate to the report you share.
              </p>
            </div>
            <div className="relative mt-14">
              <div
                aria-hidden
                className="hidden lg:block absolute top-[21px] left-[22px] right-[22px] h-[2px] bg-gradient-to-r from-violet-100 via-violet-300 to-violet-100"
              />
              <ol className="relative grid lg:grid-cols-4 gap-10 lg:gap-6 list-none m-0 p-0">
                {stages.map((s, i) => {
                  const active = i === stage;
                  return (
                    <li key={s.title}>
                      <button
                        onClick={() => setStage(i)}
                        aria-expanded={active}
                        aria-controls="module-detail"
                        className="group relative w-full text-left"
                      >
                        <span
                          className={`relative z-10 grid place-items-center size-11 rounded-full border text-[13px] font-bold transition duration-200 ${active ? "bg-violet-800 border-violet-800 text-white shadow-[0_12px_26px_-10px_rgba(76,29,149,.55)]" : "bg-white border-violet-200 text-violet-700 group-hover:border-violet-400 group-hover:-translate-y-0.5"}`}
                        >
                          {["01", "02", "03", "04"][i]}
                        </span>
                        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-400 mt-5">
                          {s.kicker}
                        </p>
                        <h3
                          className={`text-lg font-semibold mt-1 transition ${active ? "text-foreground" : "text-zinc-500 group-hover:text-foreground"}`}
                        >
                          {s.title}
                        </h3>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {s.links.map((l) => (
                            <span
                              key={l.name}
                              className={`rounded-full px-2.5 py-1 text-[10px] border transition ${active ? "bg-violet-50 border-violet-200 text-violet-700 font-medium" : "bg-white border-zinc-200 text-zinc-400"}`}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div
              id="module-detail"
              role="region"
              aria-live="polite"
              className="mt-10 rounded-3xl border border-violet-100 bg-white shadow-[0_24px_60px_-35px_rgba(76,29,149,.35)] p-6 sm:p-8"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
                <div className="lg:max-w-sm shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet-700">
                    {stages[stage].kicker}
                  </p>
                  <h3 className="text-xl sm:text-2xl font-semibold tracking-tight mt-2">
                    {stages[stage].headline}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                    {stages[stage].detail}
                  </p>
                </div>
                <div className="flex-1 grid sm:grid-cols-2 gap-3">
                  {stages[stage].links.map((l) => (
                    <Link
                      key={l.name}
                      href={l.href}
                      className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-4 flex items-center gap-3 group/card hover:border-violet-300 transition"
                    >
                      <span className="size-10 rounded-xl bg-white border border-violet-100 text-violet-600 grid place-items-center shrink-0">
                        <l.icon className="size-[18px]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold truncate">
                          {l.name}
                        </span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          {l.hint}
                        </span>
                      </span>
                      <ArrowRight className="size-4 text-violet-600 shrink-0 transition group-hover/card:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
                <div className="hidden xl:flex flex-col items-start gap-1.5 lg:w-36 shrink-0 text-[11px] text-zinc-400">
                  <span className="uppercase tracking-[.14em] text-[10px]">
                    Flows into
                  </span>
                  <span className="font-semibold text-violet-700 text-sm">
                    {stages[(stage + 1) % stages.length].title}
                  </span>
                  <span className="h-8 w-px bg-gradient-to-b from-violet-300 to-transparent ml-1" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="max-w-[1280px] mx-auto px-6 sm:px-8 py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[.18em] font-semibold text-violet-700">
                Business value
              </p>
              <h2 className="text-3xl sm:text-[40px] font-semibold tracking-tight mt-3">
                What better numbers change.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm lg:text-right lg:pb-2">
              A raise is both a negotiation and a plan. Fundraise sharpens both
              — before advisers, boards and investors do it for you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Scale,
                title: "Negotiate the whole term sheet",
                desc: "Weigh every offer on dilution, usable cash and runway — not the headline valuation alone.",
                chip: "Offer vs offer, one view",
              },
              {
                icon: Target,
                title: "Time the raise to the plan",
                desc: "Match funding months to hiring and burn so cash never becomes the story mid-quarter.",
                chip: "Month-by-month runway",
              },
              {
                icon: Users,
                title: "Alignment in the room",
                desc: "Show founders, board members and investors the same transparent assumptions and formulas.",
                chip: "One shared dataset",
              },
              {
                icon: FileCheck2,
                title: "Adviser-ready reporting",
                desc: "Export the exact numbers as a PDF or CSV your adviser or investor can read without a walkthrough.",
                chip: "PDF · CSV · JSON",
              },
            ].map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-violet-100 bg-white p-6 flex gap-4 hover:border-violet-300 transition"
              >
                <div className="size-11 shrink-0 rounded-xl bg-violet-50 border border-violet-100 text-violet-700 grid place-items-center">
                  <v.icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    {v.desc}
                  </p>
                  <span className="inline-block rounded-full bg-violet-50 border border-violet-100 px-3 py-1 text-[10px] font-medium text-violet-700 mt-4">
                    {v.chip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section
          id="why-fundraise"
          className="max-w-[1280px] mx-auto px-6 sm:px-8 py-20"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs uppercase tracking-[.18em] font-semibold text-violet-700">
                Trust is in the details
              </p>
              <h2 className="text-3xl sm:text-[40px] font-semibold tracking-tight leading-tight mt-3">
                Transparent by design.
                <br />
                <span className="gradient-text">Not a black box.</span>
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mt-5 max-w-lg">
                You should know exactly what a number means, what went into it,
                and when an assumption is missing. Fundraise makes all three
                visible.
              </p>
              <Link
                href="/guide"
                className="text-violet-700 text-sm font-semibold flex gap-2 items-center mt-7"
              >
                Read the formulas & limitations{" "}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-5">
              {[
                {
                  icon: Calculator,
                  title: "Precision before presentation",
                  desc: "Decimal arithmetic with 40-digit working precision. Rounding happens only for display.",
                },
                {
                  icon: LockKeyhole,
                  title: "Private, local-first planning",
                  desc: "No account to calculate. No financial inputs sent to analytics. Explicit browser saves and downloadable backups.",
                },
                {
                  icon: ShieldCheck,
                  title: "Honest about what’s supported",
                  desc: "Invalid assumptions are flagged, unavailable results stay unavailable, and contract-dependent terms stay gated.",
                },
              ].map((t) => (
                <div
                  key={t.title}
                  className="flex gap-4 rounded-2xl border border-border bg-white p-5"
                >
                  <div className="size-11 shrink-0 rounded-xl bg-violet-50 text-violet-700 grid place-items-center">
                    <t.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{t.title}</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {t.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          id="faq"
          className="max-w-[900px] mx-auto px-6 sm:px-8 pb-20 pt-5"
        >
          <div className="text-center mb-9">
            <p className="text-xs uppercase tracking-[.18em] font-semibold text-violet-700">
              A few things worth knowing
            </p>
            <h2 className="text-3xl font-semibold tracking-tight mt-3">
              Questions, answered.
            </h2>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="font-medium text-sm sm:text-base flex justify-between gap-4 cursor-pointer list-none">
                  {q}
                  <ChevronDown className="size-4 shrink-0 group-open:rotate-180 transition" />
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-4 pr-6">
                  {a}
                </p>
              </details>
            ))}
          </div>
        </section>
        <section className="max-w-[1280px] mx-auto px-6 sm:px-8 pb-20">
          <div className="purple-panel rounded-[28px] p-9 sm:p-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-7">
            <div className="relative">
              <p className="font-hand text-2xl text-violet-200 mb-3">
                Your next chapter starts with clarity.
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Make your next raise
                <br />a more informed one.
              </h2>
              <p className="text-sm text-violet-200 mt-5">
                No account required. Start with the numbers you have.
              </p>
            </div>
            <Link
              href="/calculator"
              className="relative bg-white text-violet-800 rounded-full px-7 py-4 font-semibold text-sm inline-flex gap-3 items-center shrink-0"
            >
              Open Fundraise <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-[#faf9fc]">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-10 flex flex-col sm:flex-row justify-between gap-7">
          <div>
            <Link href="/" className="brand-logo text-4xl">
              fundraise.
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              Know your numbers. Own your next move.
            </p>
          </div>
          <div className="flex gap-10 text-xs text-muted-foreground">
            <div className="grid gap-3">
              <span className="text-foreground font-semibold">Planning</span>
              <Link href="/calculator">Calculator</Link>
              <Link href="/cap-table">Ownership</Link>
              <Link href="/forecast">Cash forecast</Link>
            </div>
            <div className="grid gap-3">
              <span className="text-foreground font-semibold">Resources</span>
              <Link href="/guide">Guide & formulas</Link>
              <a href="#faq">FAQs</a>
              <Link href="/guide#privacy">Privacy & limitations</Link>
            </div>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-6 border-t border-border flex flex-wrap justify-between gap-3 text-[10px] text-muted-foreground">
          <span>
            © {new Date().getFullYear()} Fundraise. Built for clearer
            conversations.
          </span>
          <span>Planning estimates · Not legal, tax or investment advice</span>
        </div>
      </footer>
    </>
  );
}
