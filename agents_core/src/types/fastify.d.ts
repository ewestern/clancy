import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifySchema,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  RouteGenericInterface,
  ContextConfigDefault,
} from "fastify";
import type { DecodePayloadType, FastifyJwtNamespace } from "@fastify/jwt";
import type { TokenService } from "../services/tokenService.js";
import type { AuditService } from "../services/auditService.js";
import type { SupervisorAgent } from "../supervisor.js";
import type { AgentRegistry } from "../registry.js";
import type { MemorySystem } from "../memory.js";
import type { MultiAgentGraphCreator } from "../graphCreator.js";
import type { IntentEmitter } from "../intentEmitter.js";
import type { LLMProvider } from "./llm.js";
import type { FastifyJWTOptions } from '@fastify/jwt'
import { WebSocketManager } from "../services/websocketManager";

export type FastifyTypeBox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export type FastifyRequestTypeBox<TSchema extends FastifySchema> =
  FastifyRequest<
    RouteGenericInterface,
    RawServerDefault,
    RawRequestDefaultExpression,
    TSchema,
    TypeBoxTypeProvider
  >;

export type FastifyReplyTypeBox<TSchema extends FastifySchema> = FastifyReply<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  ContextConfigDefault,
  TSchema,
  TypeBoxTypeProvider
>;

declare module "fastify" {
  export interface FastifyInstance extends FastifyJwtNamespace<{
    jwtVerify: 'securityJwtVerify',
  }> {
    // Core services
    tokenService: TokenService;
    auditService: AuditService;
    llmProvider: LLMProvider;

    // Agent-Core specific services
    supervisor: SupervisorAgent;
    agentRegistry: AgentRegistry;
    memorySystem: MemorySystem;
    graphCreator: MultiAgentGraphCreator;
    intentEmitter: IntentEmitter;
    
    // WebSocket management
    wsManager: WebSocketManager;
  }

  //export interface FastifyRequest {
  //  jwtVerify: (options?: unknown) => Promise<DecodePayload>;
  //}
}
