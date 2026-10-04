/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `--mode test` swaps the Firebase SDK for the in-memory fakes the Playwright suites use.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      ...(mode === "test"
        ? {
            "firebase/app": path.resolve(import.meta.dirname, "../test/fb-app.js"),
            "firebase/auth": path.resolve(import.meta.dirname, "../test/fb-auth.js"),
            "firebase/firestore": path.resolve(import.meta.dirname, "../test/fb-store.js"),
          }
        : {}),
    },
  },
  build: { outDir: mode === "test" ? "dist-test" : "dist" },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
}));
