import { FastifyPluginAsync } from "fastify";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schemaAndRelations } from "../database/index.js";
import fp from "fastify-plugin";

export type Database = ReturnType<typeof drizzle<typeof schemaAndRelations>>;

const register: FastifyPluginAsync = async (fastify) => {
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL!;

  // Create PostgreSQL connection
  const queryClient = postgres(databaseUrl);

  // Create Drizzle database instance
  const db = drizzle(queryClient, { schema: schemaAndRelations });

  // Decorate Fastify instance with database
  fastify.decorate("db", db);

  // Add database connection to app context
  fastify.addHook("onClose", async () => {
    await queryClient.end();
  });

  fastify.log.info("Database connection established");
};

export const registerDatabase = fp(register, {
  name: "database",
});
