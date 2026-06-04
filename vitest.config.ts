import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vite.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      coverage: {
        provider: "v8",
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
