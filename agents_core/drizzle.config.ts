import type { Config } from 'drizzle-kit';

export default {
  schema: './src/database/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/agents_core',
  },
  verbose: true,
  strict: true,
} satisfies Config; 