import { defineConfig } from "tsup";
import universalMiddleware from "universal-middleware/esbuild";

export default defineConfig([
  {
    entry: {
      "handler": "./src/vike.handler.ts",
    },
    format: ["esm"],
    platform: "neutral",
    target: "es2022",
    esbuildPlugins: [universalMiddleware({
      serversExportNames: './[dir]/[server]',
      entryExportNames: './[dir]/[name]',
    })],
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    external: ["stream", "http", "node:stream", "node:http"],
    dts: true,
    outDir: 'dist',
    bundle: true
  },
  {
    entry: {
      "plugin/index": "./src/plugin/index.ts",
      "index": "./src/index.ts",
    },
    format: ["esm"],
    platform: "node",
    target: "es2022",
    esbuildOptions(opts) {
      opts.outbase = "src";
    },
    dts: true,
    outDir: 'dist'
  },
]);
