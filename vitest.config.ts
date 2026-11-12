import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vite.config.ts";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      pool: "threads",
      maxWorkers: 1,
      globals: true,
      testTimeout: 10000,
      hookTimeout: 10000,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "node_modules",
          "dist",
          "*.config.*",
          "src/test/**",
          "src/vite-env.d.ts",
        ],
      },
    },
  }),
);
