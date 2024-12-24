#!/usr/bin/env node

import "dotenv/config";
import * as esbuild from "esbuild";
import {
  OUTPUT_DIR_PATH,
  getScriptableBanner,
  WEBPACK_ENTRY,
} from "./common.mjs";

const OUTPUT_FILE_NAME = "Soluna.mjs";

const result = await esbuild.build({
  entryPoints: [WEBPACK_ENTRY],
  bundle: true,
  outfile: `${OUTPUT_DIR_PATH}/${OUTPUT_FILE_NAME}`,
  banner: {
    js: getScriptableBanner("yellow", "sun"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    // When developing, it can be kind of annoying to open the Scriptable logs on
    // the device. If you set the LOG_URL environment variable in the esbuild build
    // process, calls to the `log` function will HTTP POST to the given endpoint.
    "process.env.LOG_URL": `null`,
  },
  minify: false,
});

console.log(`Built with ${result.errors.length} errors`);
