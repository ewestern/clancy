import type { Config } from "drizzle-kit";

export default {
  schema: "./src/database/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://:@localhost:5432/agents_core",
  },
} satisfies Config;
