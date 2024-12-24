#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import {
  OUTPUT_DIR_PATH,
  getScriptableBanner,
  WEBPACK_ENTRY,
} from "./common.mjs";

const OUTPUT_FILE_NAME = "Soluna (Dev).mjs";
const OUTPUT_FILE_PATH = path.join(OUTPUT_DIR_PATH, OUTPUT_FILE_NAME);

const ICLOUD_SCRIPTABLE_PATH = process.env.ICLOUD_SCRIPTABLE_PATH || null;
const COPY_BUILD_TO_ICLOUD = !!ICLOUD_SCRIPTABLE_PATH;

let ctx = await esbuild.context({
  entryPoints: [WEBPACK_ENTRY],
  bundle: true,
  outfile: OUTPUT_FILE_PATH,
  banner: {
    js: getScriptableBanner("red", "sun"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    // When developing, it can be kind of annoying to open the Scriptable logs on
    // the device. If you set the LOG_URL environment variable in the esbuild build
    // process, calls to the `log` function will HTTP POST to the given endpoint.
    "process.env.LOG_URL": `null`,
  },
  minify: false,
  plugins: [
    {
      name: "copy-to-icloud",
      setup(build) {
        build.onEnd(async (result) => {
          console.log(`Built with ${result.errors.length} errors`);
          if (COPY_BUILD_TO_ICLOUD) {
            await fs.copyFile(OUTPUT_FILE_PATH, ICLOUD_SCRIPTABLE_PATH);
            console.log(
              `Copied ${OUTPUT_FILE_PATH} to ${ICLOUD_SCRIPTABLE_PATH}`,
            );
          }
        });
      },
    },
  ],
});

await ctx.watch();
console.log("Watching for changes...");
