import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/plugin.ts", "src/cli.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node18",
  splitting: false,
  outDir: "dist",
});
