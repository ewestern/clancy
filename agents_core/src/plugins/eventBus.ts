import { FastifyPluginAsync } from 'fastify';

export const registerEventBus: FastifyPluginAsync = async (fastify) => {
  // TODO: Implement event bus connection (Redis/RabbitMQ)
  fastify.log.info('Event bus plugin registered (stub)');
}; 