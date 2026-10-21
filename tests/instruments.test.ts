/// <reference types="vitest/globals" />
import { D, TOLERANCE } from "@/lib/engine/decimal";
import {
  calculateNote,
  calculateSafe,
  emptyNote,
  emptySafe,
  InstrumentResult,
} from "@/lib/engine/instruments";

const approx = (actual: string | null | undefined, expected: string) => {
  expect(actual).not.toBeNull();
  expect(D(actual!).sub(expected).abs().lte(TOLERANCE)).toBe(true);
};
const safeValue = (r: InstrumentResult, key: string) =>
  r.sections.flatMap((s) => s.values).find((v) => v.key === key)?.value;

describe("post-money SAFE", () => {
  const full = { cap: "6000000", investment: "1000000", shares: "1000000" };
  it("computes ownership, price and issuance exactly", () => {
    const r = calculateSafe(full, "units");
    expect(r.valid).toBe(true);
    approx(r.headline.ownership, "0.1666666666666666666666666666666666667");
    approx(safeValue(r, "impliedPost"), "6000000");
    approx(safeValue(r, "impliedPre"), "5000000");
    approx(r.headline.price, "6");
    // shares × price must return the invested amount (conservation).
    expect(
      D(r.headline.shares!)
        .mul(r.headline.price!)
        .sub(1000000)
        .abs()
        .lte(TOLERANCE),
    ).toBe(true);
  });
  it("keeps ownership valid without optional shares", () => {
    const r = calculateSafe(
      { cap: "6000000", investment: "1000000", shares: "" },
      "units",
    );
    expect(r.valid).toBe(true);
    expect(r.headline.price).toBeNull();
    expect(r.headline.shares).toBeNull();
    expect(r.sections[0].status).toBe("valid");
  });
  it("is incomplete until cap and investment are provided", () => {
    const r = calculateSafe({ ...emptySafe }, "units");
    expect(r.valid).toBe(false);
    expect(r.sections[0].status).toBe("incomplete");
  });
  it("rejects an investment at or above the cap", () => {
    const r = calculateSafe({ ...full, investment: "7000000" }, "units");
    expect(r.valid).toBe(false);
    expect(r.sections[0].status).toBe("invalid");
    expect(r.sections[0].issues[0].field).toBe("cap");
  });
  it("propagates malformed inputs as errors", () => {
    const r = calculateSafe({ ...full, shares: "1,2" }, "units");
    expect(r.sections[0].status).toBe("invalid");
  });
  it("honors the entry unit for cap and investment", () => {
    const r = calculateSafe(
      { cap: "60", investment: "10", shares: "1000000" },
      "lakh",
    );
    approx(r.headline.ownership, "0.1666666666666666666666666666666666667");
  });
});

describe("convertible note", () => {
  const full = {
    cap: "6000000",
    investment: "1000000",
    shares: "1000000",
    discount: "20",
    rate: "8",
    months: "12",
    roundPrice: "5",
  };
  it("accrues simple interest without compounding", () => {
    const r = calculateNote(full, "units");
    approx(safeValue(r, "accrued"), "1080000");
    approx(safeValue(r, "interest"), "80000");
  });
  it("applies the lower of cap and discount price", () => {
    const r = calculateNote(full, "units");
    expect(r.valid).toBe(true);
    approx(safeValue(r, "capPrice"), "6");
    approx(safeValue(r, "discountPrice"), "4");
    approx(safeValue(r, "appliedPrice"), "4");
    approx(r.headline.shares, "270000");
    // ownership = new / (S + new) with new = 270000, S = 1000000.
    expect(D(r.headline.ownership!).mul(127).sub(27).abs().lte(TOLERANCE)).toBe(
      true,
    );
    expect(safeValue(r, "appliedPrice")).toBe(
      r.sections.flatMap((s) => s.values).find((v) => v.key === "appliedPrice")
        ?.value,
    );
  });
  it("lets the cap govern when the discount price is higher", () => {
    const r = calculateNote({ ...full, roundPrice: "10" }, "units");
    approx(safeValue(r, "appliedPrice"), "6");
    approx(r.headline.shares, "180000");
    expect(D(r.headline.ownership!).mul(59).sub(9).abs().lte(TOLERANCE)).toBe(
      true,
    );
  });
  it("supports cap-only conversion when no round price is entered", () => {
    const r = calculateNote({ ...full, roundPrice: "" }, "units");
    expect(r.valid).toBe(true);
    expect(safeValue(r, "discountPrice")).toBeNull();
    const note = r.sections
      .flatMap((s) => s.values)
      .find((v) => v.key === "appliedPrice")?.note;
    expect(note).toContain("Cap-only");
  });
  it("zero rate and months return the principal untouched", () => {
    const r = calculateNote({ ...full, rate: "0", months: "0" }, "units");
    approx(safeValue(r, "accrued"), "1000000");
    approx(safeValue(r, "interest"), "0");
  });
  it("is incomplete without shares even when accrual is valid", () => {
    const r = calculateNote({ ...full, shares: "" }, "units");
    expect(r.valid).toBe(false);
    expect(r.sections[0].status).toBe("valid");
    expect(r.sections[1].status).toBe("incomplete");
  });
  it("still solves when the principal reaches the cap (price-based conversion)", () => {
    const r = calculateNote({ ...full, investment: "6000000" }, "units");
    expect(r.valid).toBe(true);
    // accrued 6,480,000 at the governing price 4 → 1,620,000 new shares.
    approx(r.headline.shares, "1620000");
    expect(D(r.headline.ownership!).lt(1)).toBe(true);
  });
  it("guards the accrued amount against the global money limit", () => {
    const r = calculateNote(
      { ...full, investment: "1000000000000000", rate: "99", months: "120" },
      "units",
    );
    expect(r.sections[0].status).toBe("invalid");
    expect(r.valid).toBe(false);
  });
  it("keeps the discount strictly below 100%", () => {
    const r = calculateNote({ ...full, discount: "100" }, "units");
    expect(r.sections[1].status).toBe("invalid");
  });
});
