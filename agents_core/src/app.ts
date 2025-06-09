import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import apiReference from '@scalar/fastify-api-reference';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import packageJson from '../package.json' with { type: 'json' };

// Import plugins
import { registerDatabase } from './plugins/database.js';
import { registerServices } from './plugins/services.js';
import { registerAuth } from './plugins/auth.js';
import { registerEventBus } from './plugins/eventBus.js';

// Import routes
import { healthRoutes } from './routes/health.js';
import { triggerRoutes } from './routes/triggers.js';
import { agentRoutes } from './routes/agents.js';
import {graphRoutes} from './routes/graphs.js';
import { executionRoutes } from './routes/executions.js';
import promptsRoutes from './routes/prompts.js';

export async function createApp() {
  // Get environment variables
  const nodeEnv = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || 'info';

  const app = Fastify({
    logger: {
      level: logLevel,
      ...(nodeEnv === 'development' && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }),
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: true,
  });

  // OpenAPI/Swagger setup
  await app.register(swagger, {
    hideUntagged: true,
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Agent-Core API',
        description: 'Agent-Core Service - Control plane for multi-agent workflow orchestration',
        version: packageJson.version,
      },
      servers: [],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'triggers', description: 'Trigger processing endpoints' },
        { name: 'agents', description: 'Agent management endpoints' },
        { name: 'graphs', description: 'Multi-agent graph creation endpoints' },
        { name: 'executions', description: 'Execution tracking endpoints' },
        { name: 'prompts', description: 'Prompt management endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      externalDocs: {
        url: 'https://swagger.io',
        description: 'Find more info here',
      },
    },
    refResolver: {
      buildLocalReference(json, baseUri, fragment, i) {
        if (!json.title && json.$id) {
          json.title = json.$id;
        }
        // Fallback if no $id is present
        if (!json.$id) {
          return `def-${i}`;
        }
        return `${json.$id}`;
      },
    },
  });

  // OpenAPI JSON endpoint
  app.get('/openapi.json', async (request, reply) => {
    return app.swagger();
  });

  // API Reference UI
  await app.register(apiReference, {
    routePrefix: '/reference',
    configuration: {
      url: '/openapi.json',
    },
  });

  // Register plugins
  await app.register(registerDatabase);
  await app.register(registerServices);
  await app.register(registerAuth);
  await app.register(registerEventBus);

  // Request/Response logging hooks
  app.addHook('onRequest', async (request) => {
    request.log.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      correlationId: request.headers['x-correlation-id'],
    }, 'Request received');
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
    }, 'Request completed');
  });

  // Error handler
  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
    }, 'Request failed');

    const statusCode = error.statusCode || 500;
    const errorResponse = {
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    return reply.status(statusCode).send(errorResponse);
  });

  // Register routes
  await app.register(healthRoutes, { prefix: '' });
  await app.register(triggerRoutes, { prefix: '/v1' });
  await app.register(agentRoutes, { prefix: '/v1' });
  await app.register(graphRoutes, { prefix: '/v1' });
  await app.register(executionRoutes, { prefix: '/v1' });
      await app.register(promptsRoutes);

  return app;
}

export default createApp; 