/// <reference types="vitest/globals" />
import { decodeShare, encodeShare } from "@/lib/share";
import { exampleDraft, emptyDraft } from "@/lib/engine/round";
import { newProject } from "@/lib/workspace";

const project = () => {
  const p = newProject();
  p.draft = { ...exampleDraft };
  return p;
};

describe("share link codec", () => {
  it("round-trips a scenario losslessly", () => {
    const code = encodeShare({
      v: 1,
      name: "Seed offer — October",
      project: project(),
    });
    const decoded = decodeShare(code);
    expect(decoded.v).toBe(1);
    expect(decoded.name).toBe("Seed offer — October");
    expect(decoded.project.draft).toEqual(exampleDraft);
    expect(decoded.project).toEqual(project());
  });
  it("survives unicode names and currency-neutral payloads", () => {
    const p = newProject();
    p.draft = { ...emptyDraft, valuation: "1,00,000" };
    const decoded = decodeShare(
      encodeShare({ v: 1, name: "Seed × ₹5 Cr (draft)", project: p }),
    );
    expect(decoded.name).toBe("Seed × ₹5 Cr (draft)");
    expect(decoded.project.draft.valuation).toBe("1,00,000");
  });
  it("produces URL-safe output without padding", () => {
    const code = encodeShare({ v: 1, name: "A", project: newProject() });
    expect(code).not.toMatch(/[+/=]/);
  });
  it("rejects altered payloads", () => {
    const code = encodeShare({ v: 1, name: "A", project: project() });
    expect(() => decodeShare(code.slice(2))).toThrow(/altered/);
    expect(() => decodeShare(`${code}x`)).toThrow();
  });
  it("rejects non-base64 garbage", () => {
    expect(() => decodeShare("!!!!")).toThrow(/altered/);
  });
  it("rejects oversized links before decoding", () => {
    expect(() => decodeShare("A".repeat(200_001))).toThrow(/too large/);
  });
  it("rejects schema-invalid payloads", () => {
    const bad = btoa(JSON.stringify({ v: 2, name: "A" }));
    expect(() => decodeShare(bad)).toThrow(/altered/);
  });
});
