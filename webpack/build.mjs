import "dotenv/config";
import {
  OUTPUT_DIR_PATH,
  ScriptableFrontMatterBannerPlugin,
  SolunaEnvironmentPlugin,
  WEBPACK_ENTRY,
} from "./common.mjs";

const OUTPUT_FILE_NAME = "Soluna.mjs";

export default {
  entry: WEBPACK_ENTRY,
  mode: "production",
  devtool: false,
  output: {
    path: OUTPUT_DIR_PATH,
    filename: OUTPUT_FILE_NAME,
  },
  plugins: [
    ScriptableFrontMatterBannerPlugin("yellow", "sun"),
    SolunaEnvironmentPlugin(),
  ],
  optimization: {
    mangleExports: false,
    minimize: false,
    moduleIds: "named",
  },
};
