import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/family-tree/",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
