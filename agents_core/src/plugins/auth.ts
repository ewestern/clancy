import { FastifyPluginAsync } from 'fastify';

export const registerAuth: FastifyPluginAsync = async (fastify) => {
  // TODO: Implement authentication middleware
  fastify.log.info('Auth plugin registered (stub)');
}; 