import { z } from "zod";
import { emptyNote, emptySafe } from "./engine/instruments";

/**
 * Convenience persistence for conversion-instrument inputs. Deliberately kept
 * outside the workspace schema and its engine-version gate: these are
 * scratchpad inputs, and any failure silently falls back to in-memory state
 * instead of ever blocking the workspace.
 */

const numText = z.string().max(100);
const instrumentsSchema = z
  .object({
    tab: z.enum(["priced", "safe", "note"]),
    safe: z
      .object({
        cap: numText,
        investment: numText,
        shares: numText,
      })
      .strict(),
    note: z
      .object({
        cap: numText,
        investment: numText,
        shares: numText,
        discount: numText,
        rate: numText,
        months: numText,
        roundPrice: numText,
      })
      .strict(),
  })
  .strict();
export type InstrumentsState = z.infer<typeof instrumentsSchema>;
export const INSTRUMENTS_KEY = "fundraise.instruments.v1";

export function defaultInstruments(): InstrumentsState {
  return {
    tab: "priced",
    safe: { ...emptySafe },
    note: { ...emptyNote, months: "12" },
  };
}

export function readInstruments(): InstrumentsState {
  const fallback = defaultInstruments();
  try {
    const raw = localStorage.getItem(INSTRUMENTS_KEY);
    if (!raw) return fallback;
    const parsed = instrumentsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function writeInstruments(state: InstrumentsState): void {
  try {
    localStorage.setItem(INSTRUMENTS_KEY, JSON.stringify(state));
  } catch {
    /* Convenience cache only — in-memory state remains usable. */
  }
}
