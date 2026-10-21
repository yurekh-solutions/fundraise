// Copies the Unicode TTF used for PDF exports (₹, €, £ and non-Latin names) into /public/fonts.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "public", "fonts");
const candidates = [
  ["node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf", "DejaVuSans.ttf"],
  [
    "node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf",
    "DejaVuSans-Bold.ttf",
  ],
];

mkdirSync(target, { recursive: true });
for (const [src, name] of candidates) {
  const from = join(root, src);
  if (existsSync(from)) {
    copyFileSync(from, join(target, name));
    console.log(`[fonts] copied ${name}`);
  } else {
    console.warn(
      `[fonts] ${src} not found — PDF export will fall back to currency codes.`,
    );
  }
}
