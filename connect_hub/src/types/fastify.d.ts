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
import { providerOauthMetadata } from "../database/schema.js";
import { WebSocketService } from "../services/websocketService.js";

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
  export interface FastifyInstance {
    // Core services
    getProviderSecrets: (
      providerId: string,
    ) => Promise<Record<string, any> | undefined>;
    // Configuration
    config: {
      nodeEnv: string;
      port: number;
      logLevel: string;
      auth0: {
        domain: string;
        audience: string;
        issuer: string;
      };
      database: {
        host: string;
        port: number;
        user: string;
        password: string;
        database: string;
        ssl: boolean;
      };
    };
  }
}
