/// <reference types="vitest/config" />
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// `--mode test` swaps the Firebase SDK for the in-memory fakes the Playwright suites use.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    // Install and offline. The worker is published as ./sw.js, the live app's address, so on switch-over day it replaces
    // the live app's worker instead of running beside it. Updates wait for a quiet moment (src/app/updates.ts).
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      filename: "sw.js",
      manifestFilename: "manifest.webmanifest",
      includeManifestIcons: false,
      manifest: {
        name: "Shared expenses", short_name: "Expenses", start_url: "./", scope: "./", display: "standalone", orientation: "portrait",
        background_color: "#FAFAFA", theme_color: "#FAFAFA",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,webmanifest}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        importScripts: ["sw-cleanup.js"],   // deletes the live app's "shared-expenses-v…" caches
      },
    }),
  ],
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
  build: {
    outDir: mode === "test" ? "dist-test" : "dist",
    // Firebase is big by design; scripts/size-check.mjs holds the real budgets.
    chunkSizeWarningLimit: 700,
    // Libraries in their own long-lived files, so an app update re-downloads only the app's own code.
    rolldownOptions: { output: { advancedChunks: { groups: [
      { name: "firebase", test: /node_modules[\\/](@firebase|firebase)[\\/]/ },
      { name: "vendor", test: /node_modules[\\/]/ },
    ] } } },
  },
  test: { environment: "node", include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
}));
