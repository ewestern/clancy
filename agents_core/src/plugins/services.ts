import { FastifyPluginAsync } from "fastify";
import { SupervisorAgent } from "../supervisor.js";
import { AgentRegistry } from "../registry.js";
import { MemorySystem } from "../memory.js";
import { MultiAgentGraphCreator } from "../graphCreator.js";
import { IntentEmitter } from "../intentEmitter.js";
import { TokenService } from "../services/tokenService.js";
import { AuditService } from "../services/auditService.js";
import { OpenAIProvider } from "../services/llm/index.js";

export const registerServices: FastifyPluginAsync = async (fastify) => {
  // Get environment variables directly
  const connectIqUrl =
    process.env.CONNECT_IQ_URL ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("CONNECT_IQ_URL is required in production");
        })()
      : "http://localhost:3001");

  const openaiApiKey =
    process.env.OPENAI_API_KEY ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("OPENAI_API_KEY is required in production");
        })()
      : "sk-development-key");

  const jwtSecret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "production"
      ? (() => {
          throw new Error("JWT_SECRET is required in production");
        })()
      : "development-secret");

  // Initialize core services
  const tokenService = new TokenService(jwtSecret);
  const auditService = new AuditService(fastify.db);

  const memorySystem = new MemorySystem(fastify.db);
  const agentRegistry = new AgentRegistry(fastify.db);
  const intentEmitter = new IntentEmitter(fastify.db);

  // Initialize LLM provider
  const llmProvider = new OpenAIProvider(openaiApiKey);

  const graphCreator = new MultiAgentGraphCreator(connectIqUrl, llmProvider);

  const supervisor = new SupervisorAgent(
    memorySystem,
    agentRegistry,
    intentEmitter,
  );

  // Decorate Fastify instance with services
  fastify.decorate("tokenService", tokenService);
  fastify.decorate("auditService", auditService);
  fastify.decorate("llmProvider", llmProvider);
  fastify.decorate("supervisor", supervisor);
  fastify.decorate("agentRegistry", agentRegistry);
  fastify.decorate("memorySystem", memorySystem);
  fastify.decorate("graphCreator", graphCreator);
  fastify.decorate("intentEmitter", intentEmitter);

  fastify.log.info("Core services initialized");
};
