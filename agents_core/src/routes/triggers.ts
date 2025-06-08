import { FastifyPluginAsync } from 'fastify';
import { TriggerSchema, ErrorSchema } from '../schemas/index.js';
import { Type } from '@sinclair/typebox';

export const triggerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/triggers', {
    schema: {
      tags: ['triggers'],
      body: TriggerSchema,
      response: {
        200: Type.Object({
          executionIds: Type.Array(Type.String({ format: 'uuid' })),
        }),
        400: ErrorSchema,
        500: ErrorSchema,
      },
    },
    handler: async (request, reply) => {
      // TODO: Implement trigger processing
      throw new Error('Not implemented');
    },
  });
}; 