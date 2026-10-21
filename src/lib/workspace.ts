import { z } from "zod";
import { Draft, calculateRound, emptyDraft } from "./engine/round";
import {
  ForecastInput,
  LedgerInput,
  ReturnsInput,
  SensitivityInput,
  emptyForecast,
  emptyReturns,
  emptySensitivity,
} from "./engine/planning";
import { ENGINE_VERSION } from "./engine/decimal";

const text = z.string().max(180);
const numText = z.string().max(100);
const id = z.string().min(1).max(100);
const timestamp = z.iso.datetime();
export const draftSchema = z
  .object({
    currency: z.enum(["INR", "USD", "GBP", "EUR"]),
    notation: z.enum(["indian", "international"]),
    solveFor: z.enum(["equity", "investment", "valuation"]),
    basis: z.enum(["pre", "post"]),
    unit: z.enum(["units", "thousand", "million", "lakh", "crore", "billion"]),
    valuation: numText,
    investment: numText,
    equity: numText,
    founder: numText,
    shares: numText,
    cash: numText,
    burn: numText,
    fee: numText,
    fixed: numText,
    target: numText,
    reserve: numText,
    revenue: numText,
  })
  .strict();
const holding = z
  .object({
    id,
    name: text,
    type: z.enum(["founder", "holder", "award", "pool"]),
    shares: numText,
  })
  .strict();
const investor = z.object({ id, name: text, cash: numText }).strict();
const ledger = z
  .object({
    holdings: z.array(holding).max(100),
    transfers: z
      .array(
        z
          .object({
            id,
            seller: id,
            buyer: id,
            shares: numText,
            price: numText,
            fees: numText,
          })
          .strict(),
      )
      .max(100),
    rounds: z
      .array(
        z
          .object({
            id,
            name: text,
            date: z.string().max(10),
            valuation: numText,
            poolTarget: numText,
            poolTiming: z.enum(["none", "pre", "post"]),
            investors: z.array(investor).max(100),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();
const forecast = z
  .object({
    months: numText,
    opening: numText,
    reserve: numText,
    revenue: numText,
    growth: numText,
    cogs: numText,
    opex: numText,
    expenseGrowth: numText,
    delay: numText,
    case: z.enum(["base", "upside", "downside"]),
    upsideRevenue: numText,
    upsideExpense: numText,
    downsideRevenue: numText,
    downsideExpense: numText,
    hires: z
      .array(
        z
          .object({
            id,
            name: text,
            start: numText,
            count: numText,
            salary: numText,
          })
          .strict(),
      )
      .max(100),
    funding: z
      .array(
        z
          .object({
            id,
            month: numText,
            gross: numText,
            fee: numText,
            fixed: numText,
          })
          .strict(),
      )
      .max(100),
    costs: z
      .array(
        z
          .object({
            id,
            month: numText,
            amount: numText,
            category: z.enum(["capex", "operations"]),
          })
          .strict(),
      )
      .max(100),
    overrides: z
      .array(
        z
          .object({
            month: numText,
            revenue: numText,
            cogs: numText,
            opex: numText,
          })
          .strict(),
      )
      .max(120),
    allocations: z
      .object({
        hiring: numText,
        product: numText,
        marketing: numText,
        operations: numText,
        capex: numText,
        reserve: numText,
      })
      .strict(),
  })
  .strict();
const returnsSchema = z
  .object({
    invested: numText,
    ownership: numText,
    years: numText,
    exits: z.array(numText).min(1).max(20),
  })
  .strict();
const sensitivitySchema = z
  .object({
    minVal: numText,
    maxVal: numText,
    minRaise: numText,
    maxRaise: numText,
    points: numText,
    founder: numText,
  })
  .strict();
export const projectSchema = z
  .object({
    company: z.string().max(120),
    draft: draftSchema,
    ledger,
    forecast,
    returns: returnsSchema,
    sensitivity: sensitivitySchema,
    enabled: z
      .object({
        ledger: z.boolean(),
        forecast: z.boolean(),
        returns: z.boolean(),
        sensitivity: z.boolean(),
      })
      .strict(),
  })
  .strict();
export interface Project {
  company: string;
  draft: Draft;
  ledger: LedgerInput;
  forecast: ForecastInput;
  returns: ReturnsInput;
  sensitivity: SensitivityInput;
  enabled: {
    ledger: boolean;
    forecast: boolean;
    returns: boolean;
    sensitivity: boolean;
  };
}
export function newProject(): Project {
  return structuredClone({
    company: "",
    draft: emptyDraft,
    ledger: { holdings: [], transfers: [], rounds: [] },
    forecast: emptyForecast,
    returns: emptyReturns,
    sensitivity: emptySensitivity,
    enabled: {
      ledger: false,
      forecast: false,
      returns: false,
      sensitivity: false,
    },
  });
}
const revisionSchema = z
  .object({
    id,
    number: z.number().int().min(1),
    createdAt: timestamp,
    engineVersion: z.literal(ENGINE_VERSION),
    project: projectSchema,
  })
  .strict();
const scenarioSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(120),
    createdAt: timestamp,
    updatedAt: timestamp,
    archived: z.boolean(),
    revisions: z.array(revisionSchema).min(1).max(200),
  })
  .strict();
export type Revision = z.infer<typeof revisionSchema>;
export type Scenario = z.infer<typeof scenarioSchema>;
export const storageSchema = z
  .object({
    schemaVersion: z.literal("2"),
    version: id,
    draft: projectSchema,
    activeId: id.nullable(),
    scenarios: z.array(scenarioSchema).max(200),
    comparison: z.array(id).max(3),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = data.scenarios.map((s) => s.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate scenario IDs." });
    if (data.activeId && !ids.includes(data.activeId))
      ctx.addIssue({ code: "custom", message: "Active scenario is missing." });
    if (
      new Set(data.comparison).size !== data.comparison.length ||
      data.comparison.some((i) => !ids.includes(i))
    )
      ctx.addIssue({
        code: "custom",
        message: "Invalid comparison references.",
      });
    for (const s of data.scenarios)
      for (let i = 0; i < s.revisions.length; i++) {
        if (s.revisions[i].number !== i + 1)
          ctx.addIssue({ code: "custom", message: "Invalid revision order." });
        if (!calculateRound(s.revisions[i].project.draft).canExport)
          ctx.addIssue({
            code: "custom",
            message: `Saved scenario “${s.name}” has invalid financial inputs.`,
          });
      }
  });
export type StorageData = z.infer<typeof storageSchema>;
export const STORAGE_KEY = "fundraise.workspace.v2";
export const uuid = () => crypto.randomUUID();
export function emptyStorage(): StorageData {
  return {
    schemaVersion: "2",
    version: uuid(),
    draft: newProject(),
    activeId: null,
    scenarios: [],
    comparison: [],
  };
}
export function canonicalProject(project: Project): Project {
  const p = structuredClone(project);
  p.draft[p.draft.solveFor] = "";
  return p;
}
export function readStorage(raw: string): StorageData {
  if (raw.length > 15_000_000)
    throw new Error("Backup exceeds the 15 MB limit.");
  const result = storageSchema.safeParse(JSON.parse(raw));
  if (!result.success)
    throw new Error(
      result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(" "),
    );
  return result.data;
}
export function checkConflict(
  raw: string | null,
  expected: string | null,
): void {
  if (raw == null && expected != null)
    throw new Error(
      "Storage changed in another tab. Reload or export your current draft before continuing.",
    );
  if (raw != null && JSON.parse(raw).version !== expected)
    throw new Error(
      "Another tab changed this workspace. Export your draft, then reload to avoid overwriting it.",
    );
}
