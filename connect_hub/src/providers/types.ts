export type JSONSchema = Record<string, any>;

/**
 * Rich metadata that the UI wizard and compiler consume.
 */
export interface CapabilityMeta {
  id: string;
  displayName: string;
  description: string;
  paramsSchema: JSONSchema;
  resultSchema: JSONSchema;
}

export interface EventMeta {
  name: string;
  description: string;
  payloadSchema: JSONSchema;
}

export interface Quota {
  burst: number;
  sustainedRps: number;
  docsUrl?: string;
}

export type AuthType = "none" | "oauth2" | "api_key" | "basic";

export interface ProviderCatalogEntry {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  docsUrl?: string;
  /** Identifies whether credentials are required from the end-user. */
  kind: "internal" | "external";
  /** Authentication mechanism used when `kind === "external"`. */
  auth: AuthType;
  /** Provider-native scopes required for the proxy to function. */
  requiredScopes: string[];
  capabilities: CapabilityMeta[];
  events?: EventMeta[];
  quotas?: Quota;
}

export interface EventContext {
  orgId: string;
  connectionId?: string;
  correlationId?: string;
  // Using unknown for logger here to avoid bringing in a full logger dependency yet
  logger?: unknown;
}

export interface ExecutionContext {
  orgId: string;
  /** Populated only for external providers that need OAuth */
  connectionId?: string;
  /** Fresh OAuth or API token, undefined for internal providers */
  accessToken?: string;
  retryCount: number;
  logger?: unknown;
}

export interface Capability<P = unknown, R = unknown> {
  meta: CapabilityMeta;
  execute(params: P, ctx: ExecutionContext): Promise<R>;
}

/**
 * Runtime surface that every provider must implement.
 */
export interface ProviderRuntime {
  /**
   * Returns an Action implementation for the given ID. Implementations may
   * lazily construct the Action on first request, but must cache thereafter.
   */
  getCapability<P, R>(capabilityId: string): Capability<P, R>;

  /**
   * Optional webhook/event dispatch. If your provider exposes webhooks, you can
   * dispatch based on eventName, otherwise omit.
   */
  handleEvent?(eventName: string, payload: unknown, ctx: EventContext): Promise<void>;
} 