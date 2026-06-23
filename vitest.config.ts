import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Resolve the project's "@/..." path alias (from tsconfig.json) for tests.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
