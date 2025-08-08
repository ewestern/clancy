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
import type { WebSocketService } from "../services/websocketService.js";
import type { Database } from "../plugins/database.js";
import type { FastifyJWTOptions } from "@fastify/jwt";

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
  interface FastifyInstance {
    // Database
    db: Database;
    wsService: WebSocketService;
  }
}
