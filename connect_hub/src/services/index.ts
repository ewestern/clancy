import type { FastifyTypeBox } from '../types/fastify.js';
import { TokenService } from './token.service.js';
import { AuditService } from './audit.service.js';

export async function registerServices(app: FastifyTypeBox) {



  // Register token service
  const tokenService = new TokenService();
  app.decorate('tokenService', tokenService);

  // Register audit service
  const auditService = new AuditService();
  app.decorate('auditService', auditService);

  app.log.info('All services registered successfully');
} 