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
  promptVersions: PromptSpec[];
}

export interface PromptSpec {
  version: string; // semver or date tag
  modelHint?: string;
  system: string;
  user?: string;
  fewShot?: Array<{ user: string; assistant: string }>;
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

export interface ProviderMetadata {
  id: string;
  displayName: string;
  description: string;
  icon: string;
  docsUrl?: string;
  kind: "internal" | "external";
  auth: AuthType;
  requiredScopes: string[];
}

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
  /** Retrieve a capability implementation by id (e.g. "chat.post") */
  getCapability<P, R>(capabilityId: string): Capability<P, R>;

  /** List all capability metadata for this provider (no network calls) */
  listCapabilities(): CapabilityMeta[];

  /** Static metadata about the provider (excluding capabilities array) */
  metadata: ProviderMetadata;

  /**
   * Optional webhook/event dispatch. If your provider exposes webhooks, you can
   * dispatch based on eventName, otherwise omit.
   */
  handleEvent?(
    eventName: string,
    payload: unknown,
    ctx: EventContext,
  ): Promise<void>;
}
