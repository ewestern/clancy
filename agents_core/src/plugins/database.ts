import { FastifyPluginAsync } from 'fastify';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../database/schema.js';

export const registerDatabase: FastifyPluginAsync = async (fastify) => {
  // Create PostgreSQL connection
  const queryClient = postgres(fastify.config.databaseUrl);
  
  // Create Drizzle database instance
  const db = drizzle(queryClient, { schema });
  
  // Decorate Fastify instance with database
  fastify.decorate('db', db);
  
  // Add database connection to app context
  fastify.addHook('onClose', async () => {
    await queryClient.end();
  });
  
  fastify.log.info('Database connection established');
};

// Extend Fastify instance types
declare module 'fastify' {
  interface FastifyInstance {
    db: ReturnType<typeof drizzle>;
  }
} 