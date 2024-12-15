import path from "path";
import { $ } from "zx";
import "dotenv/config";
import {
  OUTPUT_DIR_PATH,
  ScriptableFrontMatterBannerPlugin,
  SolunaEnvironmentPlugin,
  WEBPACK_ENTRY,
} from "./common.mjs";

const OUTPUT_FILE_NAME = "Soluna (Dev).mjs";
const OUTPUT_FILE_PATH = path.join(OUTPUT_DIR_PATH, OUTPUT_FILE_NAME);

const ICLOUD_SCRIPTABLE_PATH = process.env.ICLOUD_SCRIPTABLE_PATH || null;
const COPY_BUILD_TO_ICLOUD = !!ICLOUD_SCRIPTABLE_PATH;

export default {
  entry: WEBPACK_ENTRY,
  mode: "development",
  devtool: false,
  output: {
    path: OUTPUT_DIR_PATH,
    filename: OUTPUT_FILE_NAME,
  },
  plugins: [
    ScriptableFrontMatterBannerPlugin("red", "sun"),
    SolunaEnvironmentPlugin(),

    // If the ICLOUD_SCRIPTABLE_PATH environment variable is set, copy the
    // compiled build to the given path. Useful for development.
    function () {
      this.hooks.done.tap("DonePlugin", async (stats) => {
        if (COPY_BUILD_TO_ICLOUD) {
          await $`cp ${OUTPUT_FILE_PATH} ${ICLOUD_SCRIPTABLE_PATH}`;
        }

        console.log(`Copied ${OUTPUT_FILE_PATH} to ${ICLOUD_SCRIPTABLE_PATH}`);
      });
    },
  ],
};
