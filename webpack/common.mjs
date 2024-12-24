import path from "node:path";
import { fileURLToPath } from "node:url";

const THIS_FILE = fileURLToPath(import.meta.url);
export const OUTPUT_DIR_PATH = path.resolve(
  path.dirname(THIS_FILE),
  "..",
  "dist",
);

export const WEBPACK_ENTRY = "./main.mjs";

// Scriptable requires this magic comment to be at the very top of the file
export function getScriptableBanner(iconColor, iconGlyph) {
  return [
    "// Variables used by Scriptable.",
    "// These must be at the very top of the file. Do not edit.",
    `// icon-color: ${iconColor}; icon-glyph: ${iconGlyph};`,
  ].join("\n");
}
