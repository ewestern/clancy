import { FastifySchema } from "fastify";
import {
  ProviderAuth,
  ProviderKind,
  ProviderMetadata,
} from "../models/providers.js";
import { Static, Type, TSchema } from "@sinclair/typebox";
import { Database } from "../plugins/database.js";
import { triggerRegistrations } from "../database/schema.js";
import { Connection } from "../models/connection.js";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import { TriggerRegistration } from "../models/triggers.js";
import { OwnershipScopeType } from "../models/shared.js";

/**
 * Risk level assessment for capabilities.
 * Used to categorize the potential impact of capability execution.
 */
export enum CapabilityRisk {
  LOW = "LOW", // Read-only operations, minimal risk
  MEDIUM = "MEDIUM", // Data modification with limited external impact
  HIGH = "HIGH", // Significant business impact, external communication
}

/**
 * Rich metadata that the UI wizard and compiler consume.
 */
export interface CapabilityMeta {
  id: string;
  displayName: string;
  description: string;
  docsUrl?: string;
  paramsSchema: TSchema;
  resultSchema: TSchema;
  requiredScopes: string[];
  ownershipScope: OwnershipScopeType;
  risk: CapabilityRisk;
}

/**
 * Factory function type for creating capabilities.
 * Used to populate the dispatch table during provider construction.
 */
export type CapabilityFactory<P = unknown, R = unknown> = () => Capability<
  P,
  R
>;

export interface EventMeta {
  name: string;
  description: string;
  payloadSchema: TSchema;
}

export interface CallbackResult {
  tokenPayload: Record<string, unknown>;
  scopes: string[];
  externalAccountMetadata: Record<string, unknown>;
}

//export interface ProviderMetadata {
//  id: string;
//  displayName: string;
//  description: string;
//  icon: string;
//  docsUrl?: string;
//  kind: ProviderKind;
//  auth: ProviderAuth;
//}

export interface EventContext {
  orgId: string;
  connectionId?: string;
  correlationId?: string;
  // Using unknown for logger here to avoid bringing in a full logger dependency yet
  logger?: unknown;
}

export interface ExecutionContext {
  db: Database;
  orgId: string;
  externalAccountId?: string;
  tokenPayload: Record<string, unknown> | null;
  retryCount: number;
  logger?: unknown;
}

export interface Capability<P = unknown, R = unknown> {
  meta: CapabilityMeta;
  execute(params: P, ctx: ExecutionContext): Promise<R>;
}

// OAuth-specific types
export interface OAuthAuthUrlParams {
  scopes: string[];
  state: string;
}

export interface OAuthCallbackParams {
  /** Authorization code from the provider */
  code: string;
  /** OAuth state parameter for CSRF protection */
  state?: string;
  /** OAuth error if authorization failed */
  error?: string;
  /** Error description if authorization failed */
  error_description?: string;
  redirectUri?: string;
  /** Additional provider-specific callback parameters */
  [key: string]: string | undefined;
}

export interface OAuthContext {
  orgId: string;
  provider: string;
  providerSecrets: Record<string, unknown>;
  redirectUri: string;
  /** Optional PKCE code verifier for enhanced security */
  codeVerifier?: string;
  /** Original requested scopes */
  requestedScopes?: string[];
  /** Transaction ID for tracking the OAuth flow */
  transactionId?: string;
  logger?: unknown;
}

export interface ScopeValidationResult {
  isValid: boolean;
  missingScopes: string[];
  extraScopes: string[];
}

export interface Trigger<E = unknown> {
  id: string;
  requiredScopes?: string[];
  /**
   * JSON schema defining the parameters required when registering this trigger.
   */
  paramsSchema: TSchema;
  /**
   * Retrieve trigger registrations applicable for the incoming event.
   */
  getTriggerRegistrations: (
    db: Database,
    triggerId: string,
    event: E,
  ) => Promise<TriggerRegistration[]>;

  registerSubscription?: (
    db: Database,
    connectionMetadata: Record<string, unknown>,
    triggerRegistration: typeof triggerRegistrations.$inferSelect,
  ) => Promise<{
    expiresAt: Date;
    subscriptionMetadata: Record<string, unknown>;
  }>;

  /**
   * Create the event payload that will be dispatched to the run-intent bus.
   */
  createEvents: (
    event: E,
    triggerRegistration: TriggerRegistration,
  ) => Promise<
    {
      event: Record<string, unknown>;
      partitionKey: string;
    }[]
  >;
  renderTriggerDefinition?: (
    trigger: Trigger<E>,
    triggerRegistration: TriggerRegistration,
  ) => string;

  description: string;

  eventSatisfies: (event: E) => boolean;
}

export interface Webhook<S extends FastifySchema = FastifySchema, E = unknown> {
  /**
   * Fastify route schema describing the webhook endpoint.
   */
  eventSchema: S;
  validateRequest: (request: FastifyRequestTypeBox<S>) => Promise<boolean>;
  /**
   * Optional hook to modify the reply before it is sent to the client.
   * This is useful for providers that need to add additional headers or other metadata to the reply.
   */
  replyHook?: (
    request: FastifyRequestTypeBox<S>,
    reply: FastifyReplyTypeBox<S>,
  ) => Promise<void>;

  /**
   * Triggers evaluated for each incoming event.
   */
  triggers: Trigger<E>[];
}

export interface WebhookEvent {
  type: string;
  [key: string]: any;
}

/**
 * Runtime surface that every provider must implement.
 */
export interface ProviderRuntime<
  WebhookSchema extends FastifySchema = FastifySchema,
  E = WebhookEvent,
> {
  links?: string[];
  /** Retrieve a capability implementation by id (e.g. "chat.post") */
  getCapability<P, R>(capabilityId: string): Capability<P, R>;

  /** List all capability metadata for this provider (no network calls) */
  listCapabilities(): CapabilityMeta[];

  listTriggers(): Trigger<E>[];

  getTrigger?(triggerId: string): Trigger<E> | undefined;

  /** Static metadata about the provider (excluding capabilities array) */
  metadata: ProviderMetadata;

  /**
   * Map internal Clancy scopes to provider-native scopes.
   * Only required for providers with kind === "external".
   */
  scopeMapping: Record<string, string[]>;

  webhooks?: Webhook<WebhookSchema, E>[];

  /**
   * Generate the authorization URL for the OAuth flow.
   * Only required for providers with kind === "external".
   */
  generateAuthUrl?(
    params: OAuthAuthUrlParams,
    ctx: OAuthContext,
    instanceDomain?: string,
  ): string;

  /**
   * Handle the OAuth callback and exchange authorization code for tokens.
   * Only required for providers with kind === "external".
   */
  handleCallback?(
    params: OAuthCallbackParams,
    ctx: OAuthContext,
    instanceDomain?: string,
  ): Promise<CallbackResult>;

  /**
   * Refresh an expired access token using the refresh token.
   * Only required for providers with kind === "external" that support refresh tokens.
   */
  refreshToken?(
    tokenPayload: Record<string, unknown>,
    ctx: OAuthContext,
    instanceDomain?: string,
  ): Promise<Record<string, unknown>>;

  /**
   * Check if a token is still valid (not expired, not revoked).
   * Only required for providers with kind === "external".
   *
   * @param accessToken - The access token to validate
   * @returns Promise resolving to true if token is valid
   */
  isTokenValid?(accessToken: string): Promise<boolean>;
}
