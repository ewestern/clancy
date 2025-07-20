import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "./shared.js";

// OAuth Needs Request/Response Schemas
export const OAuthNeedsQuerySchema = Type.Object({
  orgId: Type.String(),
  graphId: Type.Optional(Type.String()),
});

export enum OauthNeedsStatus {
  Connected = "connected",
  NeedsAuth = "needs_auth",
  NeedsScopeUpgrade = "needs_scope_upgrade",
  TokenExpired = "token_expired",
  Error = "error",
}
export const OauthNeedsStatusSchema = StringEnum(
  [
    OauthNeedsStatus.Connected,
    OauthNeedsStatus.NeedsAuth,
    OauthNeedsStatus.NeedsScopeUpgrade,
    OauthNeedsStatus.TokenExpired,
    OauthNeedsStatus.Error,
  ],
  {
    $id: "OauthNeedsStatus",
  },
);

export const OAuthNeedsResponseSchema = Type.Array(
  Type.Object({
    provider: Type.String(),
    status: OauthNeedsStatusSchema,
    missingScopes: Type.Array(Type.String()),
    authUrlTemplate: Type.Optional(Type.String()),
    connectionId: Type.Optional(Type.String()),
    message: Type.Optional(Type.String()),
  }),
  { $id: "OAuthNeedsResponse" },
);

// OAuth Launch Request Schema
export const OAuthLaunchQuerySchema = Type.Object({
  orgId: Type.String(),
  scopes: Type.Array(Type.String()),
});

// OAuth Callback Params Schema
export const OAuthCallbackParamsSchema = Type.Object({
  provider: Type.String(),
});

export const OAuthCallbackQuerySchema = Type.Object({
  code: Type.String(),
  state: Type.String(),
  error: Type.Optional(Type.String()),
  errorDescription: Type.Optional(Type.String()),
  errorUri: Type.Optional(Type.String()),
});

export enum OauthStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Expired = "expired",
}
export const OauthStatusSchema = StringEnum(
  [
    OauthStatus.Pending,
    OauthStatus.Completed,
    OauthStatus.Failed,
    OauthStatus.Expired,
  ],
  {
    $id: "OauthStatus",
  },
);

// OAuth Success Response Schema
export const OAuthSuccessResponseSchema = Type.Object(
  {
    status: Type.Literal(OauthStatus.Completed),
    message: Type.String(),
    connectionId: Type.String(),
    provider: Type.String(),
    grantedScopes: Type.Array(Type.String()),
    redirectUrl: Type.Optional(Type.String()),
  },
  { $id: "OAuthSuccessResponse" },
);

// OAuth Error Response Schema
export const OAuthErrorResponseSchema = Type.Object(
  {
    status: Type.Literal(OauthStatus.Failed),
    error: Type.String(),
    errorDescription: Type.Optional(Type.String()),
    provider: Type.String(),
    redirectUrl: Type.Optional(Type.String()),
  },
  { $id: "OAuthErrorResponse" },
);

// OAuth Transaction Schema for internal use
export const OAuthTransactionSchema = Type.Object({
  id: Type.String(),
  orgId: Type.String(),
  provider: Type.String(),
  requestedScopes: Type.Array(Type.String()),
  state: Type.String(),
  codeVerifier: Type.Optional(Type.String()),
  redirectUri: Type.String(),
  status: Type.Union([
    Type.Literal(OauthStatus.Pending),
    Type.Literal(OauthStatus.Completed),
    Type.Literal(OauthStatus.Failed),
    Type.Literal(OauthStatus.Expired),
  ]),
  createdAt: Type.String({ format: "date-time" }),
  expiresAt: Type.String({ format: "date-time" }),
});

// Route Schema Definitions
export const OAuthNeedsEndpointSchema = {
  tags: ["OAuth"],
  description: "Check OAuth status and missing scopes for an organization",
  querystring: OAuthNeedsQuerySchema,
  response: {
    200: OAuthNeedsResponseSchema,
  },
};

export const OAuthLaunchEndpointSchema = {
  tags: ["OAuth"],
  description: "Launch OAuth authorization flow",
  params: Type.Object({
    provider: Type.String(),
  }),
  querystring: OAuthLaunchQuerySchema,
  response: {
    302: Type.Object({
      location: Type.String({ format: "uri" }),
    }),
    400: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
  },
};

export const OAuthCallbackEndpointSchema = {
  tags: ["OAuth"],
  description: "Handle OAuth callback from provider",
  params: OAuthCallbackParamsSchema,
  querystring: OAuthCallbackQuerySchema,
  response: {
    302: Type.Object({
      location: Type.String({ format: "uri" }),
    }),
    200: OAuthSuccessResponseSchema,
    400: OAuthErrorResponseSchema,
  },
};

// Type exports
export type OAuthNeedsQuery = Static<typeof OAuthNeedsQuerySchema>;
export type OAuthNeedsResponse = Static<typeof OAuthNeedsResponseSchema>;
export type OAuthLaunchQuery = Static<typeof OAuthLaunchQuerySchema>;
export type OAuthCallbackParams = Static<typeof OAuthCallbackParamsSchema>;
export type OAuthCallbackQuery = Static<typeof OAuthCallbackQuerySchema>;
export type OAuthSuccessResponse = Static<typeof OAuthSuccessResponseSchema>;
export type OAuthErrorResponse = Static<typeof OAuthErrorResponseSchema>;
export type OAuthTransaction = Static<typeof OAuthTransactionSchema>;

// OAuth Audit Request/Response Schemas
export const OAuthAuditRequestSchema = Type.Object({
  capabilities: Type.Array(
    Type.Object({
      providerId: Type.String(),
      capabilityId: Type.String(),
    }),
  ),
  triggers: Type.Array(
    Type.Object({
      providerId: Type.String(),
      triggerId: Type.String(),
    }),
  ),
});

export const OAuthAuditProviderResultSchema = Type.Object({
  providerId: Type.String(),
  providerDisplayName: Type.String(),
  providerIcon: Type.String(),
  status: Type.Union([
    Type.Literal("connected"),
    Type.Literal("needs_auth"),
    Type.Literal("needs_scope_upgrade"),
  ]),
  missingScopes: Type.Array(Type.String()),
  oauthUrl: Type.String(),
  message: Type.Optional(Type.String()),
});

export const OAuthAuditResponseSchema = Type.Array(
  OAuthAuditProviderResultSchema,
  {
    $id: "OAuthAuditResponse",
  },
);

export const OAuthAuditEndpointSchema = {
  tags: ["OAuth"],
  body: OAuthAuditRequestSchema,
  querystring: Type.Object({
    orgId: Type.String(),
  }),
  response: {
    200: OAuthAuditResponseSchema,
    400: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
  },
};

export type OAuthAuditRequest = Static<typeof OAuthAuditRequestSchema>;
export type OAuthAuditProviderResult = Static<
  typeof OAuthAuditProviderResultSchema
>;
export type OAuthAuditResponse = Static<typeof OAuthAuditResponseSchema>;
