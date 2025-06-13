import type { FastifyTypeBox } from '../types/fastify.js';
import { healthRoutes } from './health.routes.js';

export async function registerRoutes(app: FastifyTypeBox) {
  // Register health routes
  await app.register(healthRoutes);

  app.log.info('All routes registered successfully');
} 