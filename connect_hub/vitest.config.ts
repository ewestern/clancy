import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "migrations/",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
    },
  },
  resolve: {
    alias: {
      // Allow .js imports to resolve to .ts files during testing
      "./schema.js": "./schema.ts",
      "./relations.js": "./relations.ts",
    },
  },
});
