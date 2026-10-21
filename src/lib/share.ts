import { z } from "zod";
import { projectSchema } from "./workspace";

/**
 * Share links carry a scenario entirely inside the URL fragment. The fragment
 * is never sent to any server by browsers, so sharing stays consistent with
 * the local-first privacy model: only the person holding the link can decode
 * the payload, and only in their own browser.
 */

const payloadSchema = z
  .object({
    v: z.literal(1),
    name: z.string().trim().min(1).max(120),
    project: projectSchema,
  })
  .strict();
export type SharePayload = z.infer<typeof payloadSchema>;

const MAX_SHARE_BYTES = 100_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeShare(payload: SharePayload): string {
  const bytes = new TextEncoder().encode(
    JSON.stringify({ ...payload, name: payload.name.trim() }),
  );
  if (bytes.length > MAX_SHARE_BYTES)
    throw new Error(
      "This scenario is too large for a share link. Use a JSON backup instead.",
    );
  return toBase64Url(bytes);
}

export function decodeShare(code: string): SharePayload {
  if (code.length > MAX_SHARE_BYTES * 2)
    throw new Error("This share link is too large to be valid.");
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(code)));
  } catch {
    throw new Error("This share link is incomplete or was altered.");
  }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success)
    throw new Error("This share link is incomplete or was altered.");
  return parsed.data;
}

export function buildShareUrl(origin: string, code: string): string {
  return `${origin}/share#p=${code}`;
}
