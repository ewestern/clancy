import { FastifyPluginAsync } from "fastify";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schemaAndRelations } from "../database/index.js";
import fp from "fastify-plugin";
import dotenv from "dotenv";

export type Database = ReturnType<typeof drizzle<typeof schemaAndRelations>>;

const registerDatabase: FastifyPluginAsync = async (fastify) => {
  // Get database URL from environment
  dotenv.config();
  const databaseUrl = process.env.DATABASE_URL!;
  console.log("databaseUrl", databaseUrl);

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
};

export default fp(registerDatabase, {
  name: "database",
});

// Extend Fastify instance types
declare module "fastify" {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle<typeof schemaAndRelations>>;
  }
}
