#!/usr/bin/env node

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import * as esbuild from "esbuild";
import {
  OUTPUT_DIR_PATH,
  getScriptableBanner,
  ESBUILD_ENTRY,
} from "./common.mjs";

const OUTPUT_FILE_NAME = "Soluna (Dev).mjs";
const OUTPUT_FILE_PATH = path.join(OUTPUT_DIR_PATH, OUTPUT_FILE_NAME);

const ICLOUD_SCRIPTABLE_PATH = process.env.ICLOUD_SCRIPTABLE_PATH || null;
const COPY_BUILD_TO_ICLOUD = !!ICLOUD_SCRIPTABLE_PATH;
const ICLOUD_SCRIPTABLE_FILE_PATH = COPY_BUILD_TO_ICLOUD
  ? path.join(ICLOUD_SCRIPTABLE_PATH, OUTPUT_FILE_NAME)
  : null;

let ctx = await esbuild.context({
  entryPoints: [ESBUILD_ENTRY],
  bundle: true,
  outfile: OUTPUT_FILE_PATH,
  banner: {
    js: getScriptableBanner("red", "sun"),
  },
  define: {
    "process.env.NODE_ENV": '"development"',
    "process.env.LOG_URL": process.env.LOG_URL
      ? `"${process.env.LOG_URL}"`
      : "null",
  },
  minify: false,
  plugins: [
    {
      name: "copy-to-icloud",
      setup(build) {
        build.onEnd(async (result) => {
          console.log(`Built with ${result.errors.length} errors`);
          if (COPY_BUILD_TO_ICLOUD) {
            await fs.copyFile(OUTPUT_FILE_PATH, ICLOUD_SCRIPTABLE_FILE_PATH);
            console.log(
              `Copied ${OUTPUT_FILE_PATH} to ${ICLOUD_SCRIPTABLE_FILE_PATH}`,
            );
          }
        });
      },
    },
  ],
});

await ctx.watch();
console.log("Watching for changes...");
