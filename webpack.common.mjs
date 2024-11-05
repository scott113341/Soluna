import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";
import "dotenv/config";

const THIS_FILE = fileURLToPath(import.meta.url);
export const OUTPUT_DIR_PATH = path.resolve(path.dirname(THIS_FILE), "dist");

export const WEBPACK_ENTRY = "./main.mjs";

// Scriptable requires this magic comment to be at the very top of the file
export function ScriptableFrontMatterBannerPlugin(iconColor, iconGlyph) {
  return new webpack.BannerPlugin({
    banner: [
      "// Variables used by Scriptable.",
      "// These must be at the very top of the file. Do not edit.",
      `// icon-color: ${iconColor}; icon-glyph: ${iconGlyph};`,
    ].join("\n"),
    raw: true,
  });
}

// When developing, it can be kind of annoying to open the Scriptable logs on
// the device. If you set the LOG_URL environment variable in the Webpack build
// process, calls to the `log` function will HTTP POST to the given endpoint.
export function SolunaEnvironmentPlugin() {
  return new webpack.EnvironmentPlugin({
    LOG_URL: null,
  });
}
