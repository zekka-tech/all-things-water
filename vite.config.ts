import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Standalone "All Things Water" app. Independent of the parent project's Vite config.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5180,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Avoid Vite's inline module-preload polyfill so the built HTML carries no
    // inline scripts — lets the CSP drop script-src 'unsafe-inline'. Modern
    // browsers support <link rel="modulepreload"> natively.
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Function form — required by Vite 8's Rolldown bundler (the object
        // shorthand is no longer accepted by the types).
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("lucide-react")) return "icons";
          if (/[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "react";
          }
        },
      },
    },
  },
});
