import type { FastifyTypeBox } from '../types/fastify.js';

export async function registerMiddleware(app: FastifyTypeBox) {
  // Request logging middleware
  app.addHook('onRequest', async (request) => {
    request.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      correlationId: request.headers['x-correlation-id'],
    }, 'Request received');
  });

  // Response logging middleware
  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  app.log.info('All middleware registered successfully');
} 