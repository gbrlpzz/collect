import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
  },
  test: {
    globals: true,
    setupFiles: ["tests/setup.ts"],
  },
});
