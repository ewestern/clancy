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
  OAuthAuditEndpointSchema,
  OauthConnectionStatus,
  OauthConnectionStatusSchema,
} from "../models/oauth.js";
import { registry } from "../integrations.js";
import { connections, tokens, oauthTransactions } from "../database/schema.js";
import { ConnectionStatus } from "../models/connection.js";
import { OAuthContext } from "../providers/types.js";
import { getAuth, verifyToken } from "@clerk/fastify";
import { Database } from "../plugins/database.js";
import { publishEvents } from "../utils.js";
import { EventType } from "@ewestern/events";
import { OwnershipScope } from "../models/shared.js";
import { ProviderKind } from "../models/providers.js";

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
        .select({ id: tokens.id, scopes: tokens.scopes })
        .from(tokens)
        .where(
          and(
            eq(tokens.connectionId, existingConnection.id),
            eq(tokens.ownershipScope, OwnershipScope.User),
            eq(tokens.ownerId, oauthTransaction.userId),
          ),
        );

      const previousScopes = new Set<string>(
        (existingTokenRows[0]?.scopes || []) as string[],
      );
      for (const s of externalScopes) previousScopes.add(s);
      const mergedScopes = Array.from(previousScopes);

      if (existingTokenRows.length > 0) {
        await tx
          .update(tokens)
          .set({
            tokenPayload: tokenPayload,
            scopes: mergedScopes,
            ownershipScope: OwnershipScope.User,
            ownerId: oauthTransaction.userId,
            updatedAt: new Date(),
          })
          .where(eq(tokens.id, existingTokenRows[0]!.id));
      } else {
        await tx.insert(tokens).values({
          connectionId: existingConnection.id,
          tokenPayload: tokenPayload,
          scopes: mergedScopes,
          ownershipScope: OwnershipScope.User,
          ownerId: oauthTransaction.userId,
        });
      }

      await tx
        .update(connections)
        .set({
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
          capabilities: oauthTransaction.capabilities,
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
  app.addSchema(OAuthAuditEndpointSchema.response["200"]);
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
      const { token } = request.query;
      const capabilities = request.query.scopes;
      const { provider: providerId } = request.params;
      const baseUrl = process.env.REDIRECT_BASE_URL!;

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
        // Map internal Clancy scopes to provider-native scopes using scopeMapping
        const providerScopes = capabilities.flatMap((capability) => {
          const mappedScopes = provider.scopeMapping[capability];
          return mappedScopes || []; // fallback to original scope if no mapping exists
        });

        // Remove duplicates
        const uniqueProviderScopes = [...new Set(providerScopes)];

        const redirectUri = `${baseUrl}/oauth/callback/${providerId}`;
        const state = crypto.randomUUID();
        await request.server.db.insert(oauthTransactions).values({
          orgId: orgId,
          userId: userId,
          state: state,
          provider: providerId,
          capabilities: capabilities,
          requestedScopes: uniqueProviderScopes,
          redirectUri: redirectUri,
          status: OauthStatus.Pending,
        });

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

        const oauthContext: OAuthContext = {
          orgId: orgId,
          provider: providerId,
          providerSecrets: providerSecrets,
          redirectUri: redirectUri,
        };

        const authUrl = provider.generateAuthUrl(
          { scopes: uniqueProviderScopes, state: state },
          oauthContext,
        );
        // Redirect to provider's authorization URL
        return reply.redirect(authUrl);
      } catch (error) {
        app.log.error("OAuth launch failed:", error);
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
          providerSecrets: providerSecrets,
          redirectUri: `${process.env.REDIRECT_BASE_URL!}/oauth/callback/${providerId}`,
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

  // OAuth Audit - Evaluate required vs granted scopes per provider for the current user
  app.post(
    "/oauth/audit",
    {
      schema: OAuthAuditEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof OAuthAuditEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof OAuthAuditEndpointSchema>,
    ) => {
      const { userId, orgId } = getAuth(request);
      const { capabilities, triggers } = request.body;
      if (!userId || !orgId) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Missing user or organization in auth context",
        } as any);
      }

      // Group requested capabilities and triggers by provider
      const requestedCapabilitiesByProvider = capabilities.reduce(
        (acc, item) => {
          if (!acc.has(item.providerId)) {
            acc.set(item.providerId, new Set());
          }
          acc.get(item.providerId)!.add(item.capabilityId);
          return acc;
        },
        new Map<string, Set<string>>(),
      );

      const providerConnections =
        await request.server.db.query.connections.findMany({
          where: and(
            eq(connections.orgId, orgId),
            eq(connections.userId, userId),
            eq(connections.status, ConnectionStatus.Active),
            inArray(
              connections.providerId,
              Array.from(requestedCapabilitiesByProvider.keys()),
            ),
          ),
        });
      const existingProviderCapabilitySummary = providerConnections.reduce(
        (acc, connection) => {
          const providerId = connection.providerId;
          const requestedCapabilities =
            requestedCapabilitiesByProvider.get(providerId);
          if (!requestedCapabilities) {
            return acc;
          }
          const grantedCapabilities = new Set(connection.capabilities);
          const missingCapabilities =
            requestedCapabilities.difference(grantedCapabilities);
          return acc.set(providerId, {
            grantedCapabilities,
            missingCapabilities,
          });
        },
        new Map<
          string,
          { grantedCapabilities: Set<string>; missingCapabilities: Set<string> }
        >(),
      );

      const results = Array.from(
        requestedCapabilitiesByProvider.entries(),
      ).flatMap(([providerId, requestedCapabilities]) => {
        const provider = registry.getProvider(providerId);
        if (provider?.metadata.kind === ProviderKind.Internal) {
          return [];
        }
        const summary = existingProviderCapabilitySummary.get(providerId);
        const baseUrl = process.env.REDIRECT_BASE_URL!;
        const launchUrl = new URL(`${baseUrl}/oauth/launch/${providerId}`);
        if (!summary) {
          // no existing connection for this provider
          for (const scopeId of Array.from(requestedCapabilities)) {
            launchUrl.searchParams.append("scopes", scopeId);
          }
          const missingCapabilitiesDisplay = Array.from(
            requestedCapabilities,
          ).map((capability) => {
            const capabilityMeta = provider?.getCapability(capability).meta;
            return capabilityMeta?.displayName || capability;
          });
          return [
            {
              providerId: providerId,
              providerDisplayName: provider?.metadata.displayName || "",
              providerIcon: provider?.metadata.icon || "",
              status: OauthConnectionStatus.NeedsAuth,
              grantedCapabilities: [],
              missingCapabilities: missingCapabilitiesDisplay,
              oauthUrl: launchUrl.toString(),
            },
          ];
        }
        const { grantedCapabilities, missingCapabilities } = summary;
        const missingCapabilitiesDisplay = Array.from(
          missingCapabilities?.values() || [],
        ).map((capability) => {
          const capabilityMeta = provider?.getCapability(capability).meta;
          return capabilityMeta?.displayName || capability;
        });

        if (!missingCapabilities || missingCapabilities.size === 0) {
          return [
            {
              providerId: providerId,
              providerDisplayName: provider?.metadata.displayName || "",
              providerIcon: provider?.metadata.icon || "",
              status: OauthConnectionStatus.Connected,
              grantedCapabilities: [],
              missingCapabilities: missingCapabilitiesDisplay,
              oauthUrl: "",
            },
          ];
        } else {
          const cumulativeCapabilityIds =
            grantedCapabilities.union(missingCapabilities);

          for (const scopeId of Array.from(cumulativeCapabilityIds)) {
            launchUrl.searchParams.append("scopes", scopeId);
          }
          return [
            {
              providerId: providerId,
              providerDisplayName: provider?.metadata.displayName || "",
              providerIcon: provider?.metadata.icon || "",
              status: OauthConnectionStatus.NeedsScopeUpgrade,
              grantedCapabilities: [],
              missingCapabilities: missingCapabilitiesDisplay,
              oauthUrl: "",
            },
          ];
        }
      });
      return reply.status(200).send(results);
    },
  );
}
