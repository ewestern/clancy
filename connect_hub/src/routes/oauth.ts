import crypto from "node:crypto";
import { eq, and, arrayOverlaps, inArray } from "drizzle-orm";
import type {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import {
  OAuthLaunchEndpointSchema,
  OAuthCallbackEndpointSchema,
  OAuthSuccessResponseSchema,
  OAuthErrorResponseSchema,
  OauthStatus,
  OAuthCallbackQuery,
  OauthConnectionStatusSchema,
} from "../models/oauth.js";
import { registry } from "../integrations.js";
import { connections, tokens, oauthTransactions } from "../database/schema.js";
import { ConnectionStatus } from "../models/connection.js";
import { OAuthContext } from "../providers/types.js";
import { verifyToken } from "@clerk/fastify";
import { Database } from "../plugins/database.js";
import { publishEvents } from "../utils.js";
import { EventType } from "@ewestern/events";
import { OwnershipScope } from "../models/shared.js";
import { ProviderRuntime } from "../providers/types.js";

function parsePermission(permission: string): {
  providerId: string;
  itemId: string;
} {
  const [providerIdRaw, ...rest] = permission.split("/");
  const providerId = providerIdRaw ?? "";
  const itemId = rest.join("/");
  return { providerId, itemId };
}

function resolveScopesForPermission(
  permission: string,
  provider: ProviderRuntime,
): string[] {
  const { itemId } = parsePermission(permission);
  // If this itemId is a capability, map via scopeMapping
  const capScopes = provider.scopeMapping[itemId];
  if (capScopes && capScopes.length > 0) return capScopes;
  // Else check trigger
  const trigger = provider.getTrigger?.(itemId);
  if (trigger?.requiredScopes) return trigger.requiredScopes;
  return [];
}

function resolveProviderScopesFromPermissions(
  permissions: string[],
  providerId: string,
  provider: ProviderRuntime,
): string[] {
  const providerPermissions = permissions
    .map(parsePermission)
    .filter((p) => p.providerId === providerId)
    .map((p) => `${p.providerId}/${p.itemId}`);
  const scopes = providerPermissions.flatMap((perm) =>
    resolveScopesForPermission(perm, provider),
  );
  return [...new Set(scopes)];
}

// Helper function to validate OAuth callback and get transaction
async function validateOAuthCallback(db: Database, state: string) {
  const oauthTransactionResult = await db
    .select()
    .from(oauthTransactions)
    .where(eq(oauthTransactions.state, state))
    .limit(1);

  if (oauthTransactionResult.length === 0) {
    throw new Error(`Invalid state: ${state}`);
  }

  return oauthTransactionResult[0];
}

//function auditProvider(connection: typeof connections.$inferSelect, requestedCapabilities: Set<string>){
//
//
//}

// Helper function to get provider and metadata
async function getProviderAndSecrets(app: FastifyTypeBox, providerId: string) {
  const providerSecrets = await app.getProviderSecrets(providerId);
  if (!providerSecrets) {
    throw new Error(`Provider ${providerId} not found`);
  }

  const provider = registry.getProvider(providerId);
  if (!provider) {
    throw new Error(`Provider ${providerId} not found`);
  }

  if (!provider.handleCallback) {
    throw new Error(`Provider ${providerId} does not support OAuth callbacks`);
  }

  return { provider, providerSecrets };
}

// Helper function to update or create connection
async function updateOrCreateConnection(
  db: Database,
  oauthTransaction: typeof oauthTransactions.$inferSelect,
  tokenPayload: Record<string, unknown>,
  externalScopes: string[],
  externalAccountMetadata: Record<string, unknown>,
  providerId: string,
) {
  await db.transaction(async (tx) => {
    const existingConnectionResponse = await tx
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.orgId, oauthTransaction.orgId),
          eq(connections.providerId, providerId),
          eq(connections.status, ConnectionStatus.Active),
        ),
      )
      .limit(1);
    const existingConnection = existingConnectionResponse[0] || null;

    if (existingConnection) {
      // Merge scopes with any existing token to avoid losing previously granted permissions
      const existingTokenRows = await tx
        .select({
          id: tokens.id,
          scopes: tokens.scopes,
          tokenPayload: tokens.tokenPayload,
        })
        .from(tokens)
        .where(
          and(
            eq(tokens.connectionId, existingConnection.id),
            eq(tokens.ownershipScope, OwnershipScope.User),
            eq(tokens.ownerId, oauthTransaction.userId),
          ),
        );
      const existingToken = existingTokenRows[0] || null;
      if (existingToken) {
        // sometimes providers don't return a refresh token, so we need to merge the existing token payload with the new one
        const newTokenPayload = {
          ...existingToken.tokenPayload,
          ...tokenPayload,
        };
        await tx
          .update(tokens)
          .set({
            tokenPayload: newTokenPayload,
            scopes: externalScopes,
            ownershipScope: OwnershipScope.User,
            ownerId: oauthTransaction.userId,
            updatedAt: new Date(),
          })
          .where(eq(tokens.id, existingTokenRows[0]!.id));
      } else {
        // this shouldn't happen.
        await tx.insert(tokens).values({
          connectionId: existingConnection.id,
          tokenPayload: tokenPayload,
          scopes: externalScopes,
          ownershipScope: OwnershipScope.User,
          ownerId: oauthTransaction.userId,
        });
      }

      await tx
        .update(connections)
        .set({
          permissions: oauthTransaction.requestedPermissions,
          externalAccountMetadata: externalAccountMetadata,
          status: ConnectionStatus.Active,
          updatedAt: new Date(),
        })
        .where(eq(connections.id, existingConnection.id));

      await tx
        .update(oauthTransactions)
        .set({
          status: OauthStatus.Completed,
          finishedAt: new Date(),
        })
        .where(eq(oauthTransactions.id, oauthTransaction.id));
    } else {
      const [connection] = await tx
        .insert(connections)
        .values({
          userId: oauthTransaction.userId,
          permissions: oauthTransaction.requestedPermissions,
          externalAccountMetadata: externalAccountMetadata,
          orgId: oauthTransaction.orgId,
          providerId: providerId,
          status: ConnectionStatus.Active,
        })
        .returning();
      if (!connection) {
        throw new Error("Failed to create connection");
      }
      await tx.insert(tokens).values({
        connectionId: connection.id,
        tokenPayload: tokenPayload,
        scopes: externalScopes,
        ownershipScope: OwnershipScope.User,
        ownerId: oauthTransaction.userId,
      });
      await tx
        .update(oauthTransactions)
        .set({
          status: OauthStatus.Completed,
          finishedAt: new Date(),
        })
        .where(eq(oauthTransactions.id, oauthTransaction.id));
    }
  });
}

// Helper function to handle callback errors
async function handleCallbackError(
  db: Database,
  providerId: string,
  callbackParams: OAuthCallbackQuery,
  error: unknown,
) {
  // Try to send failure message if we have an oauth transaction
  try {
    const oauthTransactionResult = await db
      .select()
      .from(oauthTransactions)
      .where(eq(oauthTransactions.state, callbackParams.state))
      .limit(1);
    if (oauthTransactionResult.length > 0) {
      const oauthTransaction = oauthTransactionResult[0]!;
      await publishEvents([
        {
          event: {
            type: EventType.ProviderConnectionCompleted,
            providerId: providerId,
            connectionStatus: "failed",
            connectionId: oauthTransaction.id,
            externalAccountMetadata: {},
          },
          partitionKey: oauthTransaction.id,
        },
      ]);
    }
  } catch (wsError) {
    return {
      status: OauthStatus.Failed as const,
      error: "oauth_callback_failed",
      errorDescription:
        error instanceof Error ? error.message : "Unknown OAuth error",
      provider: providerId,
    };
  }

  return {
    status: OauthStatus.Failed as const,
    error: "oauth_callback_failed",
    errorDescription:
      error instanceof Error ? error.message : "Unknown OAuth error",
    provider: providerId,
  };
}

export async function oauthRoutes(app: FastifyTypeBox) {
  // Register schemas
  app.addSchema(OAuthSuccessResponseSchema);
  app.addSchema(OAuthErrorResponseSchema);
  app.addSchema(OauthConnectionStatusSchema);

  // OAuth Launch - Generate authorization URL and redirect
  app.get(
    "/oauth/launch/:provider",
    {
      schema: OAuthLaunchEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof OAuthLaunchEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof OAuthLaunchEndpointSchema>,
    ) => {
      const { token, permissions } = request.query;
      const { provider: providerId } = request.params;

      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const userId = payload.sub;
      const orgId = (payload.o as { id: string }).id as string;

      try {
        // Get provider
        const provider = registry.getProvider(providerId);
        if (!provider) {
          return reply.status(400).send({
            error: "provider_not_found",
            errorDescription: `Provider ${providerId} not found`,
            provider: providerId,
            status: OauthStatus.Failed,
          });
        }
        if (!provider.generateAuthUrl) {
          return reply.status(400).send({
            error: "provider_does_not_support_oauth",
            errorDescription: `Provider ${providerId} does not implement OAuth flow`,
            provider: providerId,
            status: OauthStatus.Failed,
          });
        }
        const existingConnections = await app.db.query.connections.findFirst({
          where: and(
            eq(connections.orgId, orgId),
            eq(connections.userId, userId),
            eq(connections.status, ConnectionStatus.Active),
            eq(connections.providerId, providerId),
          ),
        });

        const allPermissions = new Set([
          ...permissions,
          ...(existingConnections?.permissions || []),
        ]);
        // Resolve provider scopes from unified permissions for this provider
        const uniqueProviderScopes = resolveProviderScopesFromPermissions(
          Array.from(allPermissions),
          providerId,
          provider,
        );

        const providerSecrets =
          await request.server.getProviderSecrets(providerId);

        if (!providerSecrets) {
          return reply.status(400).send({
            error: "provider_not_found",
            errorDescription: `Provider ${providerId} not found`,
            provider: providerId,
            status: OauthStatus.Failed,
          });
        }
        const { clientId, clientSecret, redirectUri } = providerSecrets;
        const state = crypto.randomUUID();
        await request.server.db.insert(oauthTransactions).values({
          orgId: orgId,
          userId: userId,
          state: state,
          provider: providerId,
          requestedPermissions: (permissions || []).filter(
            (perm) => parsePermission(perm).providerId === providerId,
          ),
          requestedScopes: uniqueProviderScopes,
          redirectUri: redirectUri,
          status: OauthStatus.Pending,
        });

        const oauthContext: OAuthContext = {
          orgId: orgId,
          provider: providerId,
          redirectUri: redirectUri,
          clientId: clientId,
          clientSecret: clientSecret,
        };

        const authUrl = provider.generateAuthUrl(
          { scopes: uniqueProviderScopes, state: state },
          oauthContext,
        );
        // Redirect to provider's authorization URL
        return reply.redirect(authUrl);
      } catch (error) {
        app.log.error(error);
        return reply.status(400).send({
          error: "oauth_launch_failed",
          errorDescription:
            error instanceof Error ? error.message : "Unknown error",
          provider: providerId,
          status: OauthStatus.Failed,
        });
      }
    },
  );

  // OAuth Callback - Handle callback from provider
  app.get(
    "/oauth/callback/:provider",
    {
      schema: OAuthCallbackEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof OAuthCallbackEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof OAuthCallbackEndpointSchema>,
    ) => {
      const { provider: providerId } = request.params;
      const callbackParams = request.query;

      try {
        // Validate OAuth callback and get transaction
        const oauthTransaction = await validateOAuthCallback(
          app.db,
          callbackParams.state,
        );
        if (!oauthTransaction) {
          throw new Error(`Invalid state: ${callbackParams.state}`);
        }

        // Get provider and metadata
        const { provider, providerSecrets } = await getProviderAndSecrets(
          app,
          providerId,
        );

        // Set up OAuth context
        const oauthContext: OAuthContext = {
          orgId: oauthTransaction.orgId,
          provider: providerId,
          clientId: providerSecrets.clientId,
          clientSecret: providerSecrets.clientSecret,
          redirectUri: oauthTransaction.redirectUri,
          requestedScopes: oauthTransaction.requestedScopes,
          logger: app.log,
        };

        // Handle provider callback
        const { tokenPayload, scopes, externalAccountMetadata } =
          await provider.handleCallback!(callbackParams, oauthContext);

        // Update or create connection
        await updateOrCreateConnection(
          app.db,
          oauthTransaction,
          tokenPayload,
          scopes,
          externalAccountMetadata,
          providerId,
        );
        await publishEvents([
          {
            event: {
              type: EventType.ProviderConnectionCompleted,
              providerId: providerId,
              connectionStatus: "connected",
              connectionId: oauthTransaction.id,
              externalAccountMetadata: externalAccountMetadata,
              userId: oauthTransaction.userId,
              orgId: oauthTransaction.orgId,
            },
            partitionKey: oauthTransaction.id,
          },
        ]);

        return reply.redirect(`/public/oauth/success.html`);
      } catch (error) {
        await handleCallbackError(app.db, providerId, callbackParams, error);
        request.log.error(error, "OAuth callback error");

        // Redirect to error page with error details in query params
        const errorType = encodeURIComponent("oauth_callback_failed");
        const errorDescription = encodeURIComponent(
          error instanceof Error ? error.message : "Unknown OAuth error",
        );
        return reply.redirect(
          `/public/oauth/error.html?error=${errorType}&error_description=${errorDescription}`,
        );
      }
    },
  );
}
