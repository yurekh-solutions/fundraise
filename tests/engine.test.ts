/// <reference types="vitest/globals" />
import { D, ENGINE_VERSION, TOLERANCE } from "@/lib/engine/decimal";
import { calculateRound, Draft, emptyDraft } from "@/lib/engine/round";
import {
  calculateForecast,
  calculateLedger,
  calculateReturns,
  calculateSensitivity,
  emptyForecast,
  poolTopUp,
  LedgerInput,
} from "@/lib/engine/planning";
import {
  parseAmount,
  parseNumber,
  parsePercent,
  toDraftText,
} from "@/lib/engine/parse";
import { format } from "@/lib/format";
import { buildReport, csvCell, reportCsv } from "@/lib/report";
import {
  canonicalProject,
  checkConflict,
  emptyStorage,
  newProject,
  readStorage,
} from "@/lib/workspace";
const fixture: Draft = {
  ...emptyDraft,
  valuation: "5000000",
  investment: "1000000",
  founder: "60",
  shares: "1000000",
  cash: "200000",
  burn: "100000",
  fee: "2",
  revenue: "1000000",
};
const approx = (actual: string | null | undefined, expected: string) => {
  expect(actual).not.toBeNull();
  expect(D(actual!).sub(expected).abs().lte(TOLERANCE)).toBe(true);
};
const value = (d: Draft, key: string) =>
  calculateRound(d)
    .sections.flatMap((s) => s.values)
    .find((v) => v.key === key)?.value;
const ledgerFixture = (
  timing: "none" | "pre" | "post" = "none",
): LedgerInput => ({
  holdings: [
    { id: "founder", name: "Founder", type: "founder", shares: "1000000" },
  ],
  transfers: [],
  rounds: [
    {
      id: "seed",
      name: "Seed",
      date: "2026-10-16",
      valuation: "5000000",
      investors: [{ id: "investor", name: "Investor", cash: "1000000" }],
      poolTarget: timing === "none" ? "0" : "10",
      poolTiming: timing,
    },
  ],
});

describe(`Priced rounds · engine ${ENGINE_VERSION}`, () => {
  it("FIN-01 pre-money equity solve", () => {
    const r = calculateRound(fixture);
    expect(r.core?.post).toBe("6000000");
    approx(r.core?.equity, D(1).div(6).toFixed());
    expect(r.canExport).toBe(true);
  });
  it("FIN-02 post-money equity solve", () => {
    const r = calculateRound({
      ...fixture,
      basis: "post",
      valuation: "6000000",
    });
    expect(r.core?.pre).toBe("5000000");
    approx(r.core?.equity, D(1).div(6).toFixed());
  });
  it("FIN-03 pre-money investment solve", () => {
    const r = calculateRound({
      ...fixture,
      solveFor: "investment",
      equity: "20",
    });
    expect(r.core?.investment).toBe("1250000");
    expect(r.core?.post).toBe("6250000");
  });
  it("FIN-04 post-money investment solve", () => {
    const r = calculateRound({
      ...fixture,
      solveFor: "investment",
      equity: "20",
      basis: "post",
      valuation: "6000000",
    });
    expect(r.core?.investment).toBe("1200000");
    expect(r.core?.pre).toBe("4800000");
  });
  it("FIN-05 valuation solve", () => {
    const r = calculateRound({
      ...fixture,
      solveFor: "valuation",
      equity: "20",
    });
    expect(r.core?.post).toBe("5000000");
    expect(r.core?.pre).toBe("4000000");
  });
  it("FIN-06 percentage points differ from relative dilution", () => {
    const d = { ...fixture, solveFor: "investment" as const, equity: "20" };
    approx(value(d, "founderAfter"), ".48");
    approx(value(d, "loss"), "12");
    approx(value(d, "relativeDilution"), ".2");
  });
  it("FIN-07 illustrative share issuance", () => {
    expect(value(fixture, "price")).toBe("5");
    expect(value(fixture, "newShares")).toBe("200000");
    expect(value(fixture, "totalShares")).toBe("1200000");
  });
  it("FIN-08 proceeds runway and gap", () => {
    expect(value(fixture, "net")).toBe("980000");
    expect(value(fixture, "cashAfter")).toBe("1180000");
    expect(value(fixture, "runwayAfter")).toBe("11.8");
    expect(value(fixture, "gap")).toBe("620000");
    expect(value(fixture, "revenueMultiple")).toBe("5");
  });
  it("FIN-09 fee gross-up", () => {
    approx(value(fixture, "grossRequired"), D("1600000").div(".98").toFixed());
    approx(value(fixture, "additional"), D("620000").div(".98").toFixed());
  });
  it("no transaction means no fixed-cost gross-up", () => {
    expect(
      value({ ...fixture, cash: "2000000", fixed: "100" }, "grossRequired"),
    ).toBe("0");
  });
  it.each(["0", "100", "-1", "101"])("INVALID-01 equity %s", (equity) => {
    const r = calculateRound({ ...fixture, solveFor: "valuation", equity });
    expect(r.core).toBeNull();
    expect(r.canExport).toBe(false);
    expect(r.errors.equity).toBeTruthy();
  });
  it.each(["-1", "NaN", "Infinity", "₹100", "1e7"])(
    "rejects invalid amount %s",
    (valuation) => {
      expect(calculateRound({ ...fixture, valuation }).core).toBeNull();
    },
  );
  it("post must exceed investment", () => {
    expect(
      calculateRound({ ...fixture, basis: "post", valuation: "1000000" }).core,
    ).toBeNull();
  });
  it("INVALID-02 invalid optional assumptions do not poison core or default", () => {
    const r = calculateRound({ ...fixture, founder: "bad", fee: "-5" });
    expect(r.core).not.toBeNull();
    expect(r.sections.find((s) => s.id === "ownership")?.status).toBe(
      "invalid",
    );
    expect(r.sections.find((s) => s.id === "fees")?.values).toEqual([]);
    expect(r.canExport).toBe(false);
  });
  it("missing founder is incomplete, not defaulted", () => {
    const r = calculateRound({ ...fixture, founder: "" });
    expect(r.sections.find((s) => s.id === "ownership")?.status).toBe(
      "incomplete",
    );
    expect(r.inputs.find((i) => i.key === "founder")?.value).toBeNull();
  });
  it("deductions cannot exceed gross", () => {
    expect(
      calculateRound({ ...fixture, fee: "100", fixed: "1" }).canExport,
    ).toBe(false);
  });
  it("100% fee makes required financing impossible", () => {
    expect(value({ ...fixture, fee: "100" }, "grossRequired")).toBeNull();
  });
  it("EMPTY-01 missing cash/burn; zero burn and revenue", () => {
    expect(
      calculateRound({ ...fixture, cash: "", burn: "" }).sections.find(
        (s) => s.id === "runway",
      )?.status,
    ).toBe("incomplete");
    const d = { ...fixture, burn: "0", revenue: "0" };
    expect(value(d, "runwayAfter")).toBeNull();
    expect(value(d, "revenueMultiple")).toBeNull();
    expect(
      calculateRound(d)
        .sections.flatMap((s) => s.values)
        .find((v) => v.key === "runwayAfter")?.note,
    ).toContain("No depletion");
  });
  it("founder zero has undefined relative dilution", () => {
    expect(value({ ...fixture, founder: "0" }, "founderAfter")).toBe("0");
    expect(value({ ...fixture, founder: "0" }, "relativeDilution")).toBeNull();
  });
  it("derived limit enforced", () => {
    expect(
      calculateRound({
        ...fixture,
        valuation: "1000000000000000",
        investment: "1",
      }).core,
    ).toBeNull();
  });
  it("fractional draft conversion never trims integer trailing zeros", () => {
    expect(toDraftText(D("5000000"))).toBe("5000000");
    expect(toDraftText(D("1250000"), "million")).toBe("1.25");
  });
  it("deterministic randomized reverse-solving and conservation", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed;
    };
    for (let i = 0; i < 200; i++) {
      const P = String(100000 + (random() % 9000000)),
        I = String(10000 + (random() % 2000000));
      const a = calculateRound({ ...emptyDraft, valuation: P, investment: I });
      const e = D(a.core!.equity);
      expect(D(P).add(I).eq(a.core!.post)).toBe(true);
      approx(e.add(D(P).div(a.core!.post)).toFixed(), "1");
      const b = calculateRound({
        ...emptyDraft,
        solveFor: "investment",
        valuation: P,
        equity: e.mul(100).toFixed(),
      });
      approx(b.core?.investment, I);
      const higher = calculateRound({
        ...emptyDraft,
        valuation: P,
        investment: D(I).mul(2).toFixed(),
      });
      expect(D(higher.core!.equity).gt(e)).toBe(true);
    }
  });
});

describe("Detailed ownership", () => {
  it("FIN-10 multiple investors", () => {
    const input = ledgerFixture();
    input.rounds[0].investors = [
      { id: "a", name: "A", cash: "600000" },
      { id: "b", name: "B", cash: "400000" },
    ];
    const r = calculateLedger(input);
    expect(r.valid).toBe(true);
    approx(r.rows.find((h) => h.id === "a")?.fraction, ".1");
    approx(r.rows.find((h) => h.id === "b")?.fraction, D(1).div(15).toFixed());
  });
  it("POOL-01 pre-money", () => {
    const r = calculateLedger(ledgerFixture("pre"));
    expect(r.valid).toBe(true);
    approx(r.snapshots[0].price, "4.4");
    approx(r.snapshots[0].poolAdded, D("150000").div("1.1").toFixed());
    approx(r.rows.find((h) => h.type === "pool")?.fraction, ".1");
    approx(
      r.rows.find((h) => h.id === "founder")?.fraction,
      D(11).div(15).toFixed(),
    );
  });
  it("POOL-02 post-money dilutes investor", () => {
    const r = calculateLedger(ledgerFixture("post"));
    expect(r.valid).toBe(true);
    approx(r.rows.find((h) => h.id === "investor")?.fraction, ".15");
    approx(r.rows.find((h) => h.type === "pool")?.fraction, ".1");
  });
  it("existing pool is not automatically cancelled", () => {
    expect(
      poolTopUp(
        D(1000000),
        D(200000),
        D(5000000),
        D(1000000),
        D(".1"),
        "pre",
      ).eq(0),
    ).toBe(true);
  });
  it("impossible pool fails", () => {
    expect(() =>
      poolTopUp(D(1000000), D(0), D(5000000), D(1000000), D(".9"), "pre"),
    ).toThrow();
  });
  it("ROUND-01 sequential founder retention", () => {
    const input = ledgerFixture();
    input.rounds[0].valuation = "4000000";
    input.rounds.push({
      id: "a",
      name: "Series A",
      date: "2027-01-01",
      valuation: "6000000",
      investors: [{ id: "a-investor", name: "A investor", cash: "2000000" }],
      poolTarget: "0",
      poolTiming: "none",
    });
    const original = JSON.stringify(input);
    const r = calculateLedger(input);
    approx(r.rows.find((h) => h.id === "founder")?.fraction, ".6");
    expect(JSON.stringify(input)).toBe(original);
    approx(r.snapshots[0].rows.find((h) => h.id === "founder")?.fraction, ".8");
  });
  it("SECONDARY-01 shares unchanged, no primary cash", () => {
    const input: LedgerInput = {
      holdings: [
        { id: "s", name: "Seller", type: "founder", shares: "1000" },
        { id: "b", name: "Buyer", type: "holder", shares: "0" },
      ],
      rounds: [],
      transfers: [
        {
          id: "t",
          seller: "s",
          buyer: "b",
          shares: "100",
          price: "10",
          fees: "0",
        },
      ],
    };
    const r = calculateLedger(input);
    expect(r.valid).toBe(true);
    expect(r.total).toBe("1000");
    approx(r.rows.find((h) => h.id === "b")?.fraction, ".1");
    expect(r.snapshots).toEqual([]);
  });
  it("rejects overselling", () => {
    const input = ledgerFixture();
    input.transfers = [
      {
        id: "t",
        seller: "founder",
        buyer: "absent",
        shares: "100",
        price: "1",
        fees: "0",
      },
    ];
    expect(calculateLedger(input).valid).toBe(false);
  });
  it("basic denominator excludes awards and pool", () => {
    const input = ledgerFixture();
    input.rounds = [];
    input.holdings.push({
      id: "award",
      name: "Award",
      type: "award",
      shares: "100000",
    });
    const r = calculateLedger(input);
    expect(r.rows[0].basicFraction).toBe("1");
    expect(r.rows[1].basicFraction).toBeNull();
  });
});

describe("Forecast and outcomes", () => {
  const f = {
    ...emptyForecast,
    months: "3",
    opening: "100",
    revenue: "20",
    opex: "50",
    delay: "1",
    funding: [{ id: "f", month: "2", gross: "100", fee: "2", fixed: "0" }],
  };
  it("dated funding and collection delay", () => {
    const r = calculateForecast(f);
    expect(r.valid).toBe(true);
    expect(r.rows[0].closing).toBe("50");
    expect(r.rows[1].closing).toBe("118");
    expect(r.rows[2].closing).toBe("88");
  });
  it("allocation budgets not deducted twice", () => {
    const a = calculateForecast(f),
      b = calculateForecast({
        ...f,
        allocations: { ...f.allocations, hiring: "98" },
      });
    expect(a.rows).toEqual(b.rows);
    expect(b.unallocated).toBe("0");
  });
  it("monthly cash reconciles", () => {
    for (const row of calculateForecast(f).rows)
      expect(
        D(row.opening)
          .add(row.receipts)
          .add(row.gross)
          .sub(row.outflows)
          .sub(row.capex)
          .sub(row.fees)
          .eq(row.closing),
      ).toBe(true);
  });
  it("rejects out-of-horizon financing", () => {
    expect(
      calculateForecast({ ...f, funding: [{ ...f.funding[0], month: "4" }] })
        .valid,
    ).toBe(false);
  });
  it("first below-zero month", () => {
    expect(
      calculateForecast({ ...f, funding: [], delay: "0", opex: "70" })
        .belowZero,
    ).toBe(3);
  });
  it("EXIT-01 common-equity returns", () => {
    const r = calculateReturns({
      invested: "1000000",
      ownership: "20",
      years: "5",
      exits: ["10000000"],
    });
    expect(r.rows[0].proceeds).toBe("2000000");
    expect(r.rows[0].moic).toBe("2");
    approx(r.rows[0].annualized, D(2).pow(D(1).div(5)).sub(1).toFixed());
  });
  it("zero exit means −100% return, not unavailable", () => {
    expect(
      calculateReturns({
        invested: "1",
        ownership: "20",
        years: "5",
        exits: ["0"],
      }).rows[0].annualized,
    ).toBe("-1");
  });
  it("sensitivity boundaries and invalid cells", () => {
    const r = calculateSensitivity({
      minVal: "5000000",
      maxVal: "6000000",
      minRaise: "1000000",
      maxRaise: "2000000",
      points: "2",
      founder: "60",
    });
    approx(r.rows[0].cells[0]?.founder, ".5");
    expect(
      calculateSensitivity({
        minVal: "1",
        maxVal: "2",
        minRaise: "1",
        maxRaise: "2",
        points: "12",
        founder: "100",
      }).valid,
    ).toBe(false);
  });
});

describe("Parsing, storage and reports", () => {
  it("exact units and percent conversion", () => {
    const p = parseAmount("1.25", "crore"),
      e = parsePercent("20", { exclusive: true });
    expect(p.kind === "ok" && p.value.toFixed()).toBe("12500000");
    expect(e.kind === "ok" && e.value.toFixed()).toBe("0.2");
  });
  it("rejects malformed decimal locale", () => {
    expect(parseNumber("1.000,50").kind).toBe("error");
  });
  it.each([
    ["1,000.50", "1000.5"],
    ["1,00,000", "100000"],
    ["1 000", "1000"],
    ["1_000", "1000"],
    ["-12,34,567.89", "-1234567.89"],
    ["+1,000", "1000"],
  ])("accepts valid grouping %s", (text, expected) => {
    const parsed = parseNumber(text);
    expect(parsed.kind === "ok" && parsed.value.toFixed()).toBe(expected);
  });
  it.each([
    "1,2",
    "1,,000",
    "100,00",
    "1 00",
    "1,23,4567",
    "1,000.2,0",
    "1,000.2 0",
    "9".repeat(101),
  ])("rejects malformed or oversized input %s", (text) => {
    expect(parseNumber(text).kind).toBe("error");
  });
  it("grouped numeric forecast and return assumptions export without raw Decimal errors", () => {
    const p = newProject();
    p.draft = fixture;
    p.enabled.forecast = true;
    p.enabled.returns = true;
    p.forecast = {
      ...emptyForecast,
      months: "3",
      opening: "1,000",
      revenue: "0",
      opex: "100",
      funding: [{ id: "f", month: "1", gross: "1,000", fee: "0", fixed: "0" }],
      allocations: { ...emptyForecast.allocations, hiring: "1,000" },
    };
    p.returns = {
      invested: "1,000",
      ownership: "20",
      years: "5",
      exits: ["10,000"],
    };
    const report = buildReport(p);
    expect(report.blocked).toBe(false);
    expect(
      report.sections.find((s) => s.id === "forecast")?.tables[1].rows[0],
    ).toEqual(["hiring", "₹1,000.00"]);
    expect(
      report.sections.find((s) => s.id === "returns")?.tables[0].title,
    ).toContain("Invested ₹1,000.00");
    expect(reportCsv([report])).toContain("₹1,000.00");
  });
  it("REPORT-01 every solve mode and currency", () => {
    for (const currency of ["INR", "USD", "GBP", "EUR"] as const)
      for (const solveFor of ["equity", "investment", "valuation"] as const) {
        const p = newProject();
        p.draft = { ...fixture, currency, solveFor, equity: "20" };
        const r = buildReport(p);
        expect(r.blocked).toBe(false);
        const inputs = r.sections.find((s) => s.id === "inputs")!;
        expect(
          inputs.rows.some(
            (v) =>
              v.label ===
              (solveFor === "equity"
                ? "Investor ownership"
                : solveFor === "investment"
                  ? "Gross primary investment"
                  : "Entered equity valuation"),
          ),
        ).toBe(false);
        expect(reportCsv([r])).toContain(currency);
      }
  });
  it("solved stale input excluded", () => {
    const p = newProject();
    p.draft = { ...fixture, equity: "stale-invalid-99" };
    expect(buildReport(p).blocked).toBe(false);
    expect(reportCsv([buildReport(p)])).not.toContain("stale-invalid-99");
    expect(canonicalProject(p).draft.equity).toBe("");
  });
  it.each(["=SUM(1,2)", "+cmd", "@evil", "-1+1", "  =formula", "\tcmd"])(
    "REPORT-03 formula text %s",
    (value) => {
      expect(csvCell(value)).toMatch(/^"'/);
    },
  );
  it("CSV quotes and newlines escaped", () => {
    expect(csvCell('a"b\nc')).toBe('"a""b\nc"');
  });
  it("invalid optional field blocks complete report", () => {
    const p = newProject();
    p.draft = { ...fixture, fee: "bad" };
    expect(buildReport(p).blocked).toBe(true);
    expect(() => reportCsv([buildReport(p)])).toThrow();
  });
  it("missing sections explicitly omitted", () => {
    const p = newProject();
    p.draft = { ...emptyDraft, valuation: "5", investment: "1" };
    const r = buildReport(p);
    expect(r.blocked).toBe(false);
    expect(r.warnings.some((w) => w.includes("Runway"))).toBe(true);
  });
  it("mixed currency warning", () => {
    const p = newProject();
    p.draft = fixture;
    const a = buildReport(p);
    p.draft = { ...fixture, currency: "EUR" };
    expect(reportCsv([a, buildReport(p)])).toContain("Currencies differ");
  });
  it("DATA-02 corrupt or unsupported schemas rejected", () => {
    expect(() => readStorage("{bad")).toThrow();
    const data = emptyStorage();
    expect(() =>
      readStorage(JSON.stringify({ ...data, schemaVersion: "999" })),
    ).toThrow();
    expect(() =>
      readStorage(
        JSON.stringify({
          ...data,
          draft: { ...data.draft, draft: { ...emptyDraft, currency: "XYZ" } },
        }),
      ),
    ).toThrow();
  });
  it("JSON round-trip retains decimal text", () => {
    const data = emptyStorage();
    data.draft.draft = { ...fixture, valuation: "5000000.1234567890123456789" };
    expect(readStorage(JSON.stringify(data)).draft.draft.valuation).toBe(
      data.draft.draft.valuation,
    );
  });
  it("another-tab conflicts are non-overwriting", () => {
    expect(() => checkConflict('{"version":"new"}', "old")).toThrow();
    expect(() => checkConflict(null, "old")).toThrow();
    expect(() => checkConflict(null, null)).not.toThrow();
  });
  it("Unicode currency and Indian grouping", () => {
    expect(format("10000000", "money", "INR", "indian")).toBe(
      "₹1,00,00,000.00",
    );
    expect(format("1", "money", "EUR")).toBe("€1.00");
  });
});
