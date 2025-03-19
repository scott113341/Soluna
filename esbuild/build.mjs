#!/usr/bin/env node

import "dotenv/config";
import * as esbuild from "esbuild";
import {
  OUTPUT_DIR_PATH,
  getScriptableBanner,
  ESBUILD_ENTRY,
} from "./common.mjs";
import path from "node:path";

const OUTPUT_FILE_NAME = "Soluna.mjs";
const OUTPUT_FILE_PATH = path.join(OUTPUT_DIR_PATH, OUTPUT_FILE_NAME);

const result = await esbuild.build({
  entryPoints: [ESBUILD_ENTRY],
  bundle: true,
  outfile: OUTPUT_FILE_PATH,
  banner: {
    js: getScriptableBanner("yellow", "sun"),
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.LOG_URL": process.env.LOG_URL
      ? `"${process.env.LOG_URL}"`
      : "null",
  },
  minify: false,
});

console.log(`Built with ${result.errors.length} errors`);
