import { FastifyPluginAsync } from 'fastify';
import { SupervisorAgent } from '../supervisor.js';
import { AgentRegistry } from '../registry.js';
import { MemorySystem } from '../memory.js';
import { MultiAgentGraphCreator } from '../graphCreator.js';
import { IntentEmitter } from '../intentEmitter.js';
import { TokenService } from '../services/tokenService.js';
import { AuditService } from '../services/auditService.js';

export const registerServices: FastifyPluginAsync = async (fastify) => {
  // Initialize core services
  const tokenService = new TokenService(fastify.config);
  const auditService = new AuditService(fastify.db);
  
  const memorySystem = new MemorySystem(fastify.db);
  const agentRegistry = new AgentRegistry(fastify.db);
  const intentEmitter = new IntentEmitter(fastify.db);
  
  const graphCreator = new MultiAgentGraphCreator(
    fastify.config.connectIqUrl,
    fastify.config.openaiApiKey
  );
  
  const supervisor = new SupervisorAgent(
    memorySystem,
    agentRegistry,
    intentEmitter
  );
  
  // Decorate Fastify instance with services
  fastify.decorate('tokenService', tokenService);
  fastify.decorate('auditService', auditService);
  fastify.decorate('supervisor', supervisor);
  fastify.decorate('agentRegistry', agentRegistry);
  fastify.decorate('memorySystem', memorySystem);
  fastify.decorate('graphCreator', graphCreator);
  fastify.decorate('intentEmitter', intentEmitter);
  
  fastify.log.info('Core services initialized');
}; 