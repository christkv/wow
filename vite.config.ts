import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    assetsInlineLimit: 0,
    sourcemap: false,
    target: "baseline-widely-available",
    rollupOptions: {
      input: { game: "index.html", collisionLab: "collision-lab.html" }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 4173
  },
  preview: {
    host: "127.0.0.1",
    port: 4173
  },
  test: {
    include: ["tests/**/*.test.ts"]
  }
});
