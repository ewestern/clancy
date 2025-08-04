import crypto from "node:crypto";
import { eq, and, or } from "drizzle-orm";
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
  OAuthAuditRequest,
  OAuthAuditProviderResult,
} from "../models/oauth.js";
import { registry } from "../integrations.js";
import { connections, tokens, oauthTransactions } from "../database/schema.js";
import { ConnectionStatus } from "../models/connection.js";
import { OAuthContext } from "../providers/types.js";
import { getAuth } from "@clerk/fastify";
import { Database } from "../plugins/database.js";
import { publishEvents } from "../utils.js";
import { EventType, ProviderConnectionCompletedEvent } from "@ewestern/events";
import { OwnershipScope } from "../models/shared.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { schemaAndRelations } from "../database/index.js";

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
  scopes: string[],
  externalAccountMetadata: Record<string, unknown>,
  orgId: string,
  providerId: string,
) {
  await db.transaction(async (tx) => {
    const existingConnectionResponse = await tx
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.orgId, orgId),
          eq(connections.providerId, providerId),
          eq(connections.status, ConnectionStatus.Active),
        ),
      )
      .limit(1);
    const existingConnection = existingConnectionResponse[0] || null;



    if (existingConnection) {
      // Update existing token for this ownership scope/owner combination
      await tx
        .update(tokens)
        .set({
          tokenPayload: tokenPayload,
          scopes: scopes,
          ownershipScope: OwnershipScope.User,
          ownerId: oauthTransaction.userId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tokens.connectionId, existingConnection.id),
            eq(tokens.ownershipScope, OwnershipScope.User),
            eq(tokens.ownerId, oauthTransaction.userId),
          ),
        );

      // If no matching token was updated, insert a new one
      const updateResult = await tx
        .select({ id: tokens.id })
        .from(tokens)
        .where(
          and(
            eq(tokens.connectionId, existingConnection.id),
            eq(tokens.ownershipScope, OwnershipScope.User),
            eq(tokens.ownerId, oauthTransaction.userId),
          ),
        );

      if (updateResult.length === 0) {
        await tx.insert(tokens).values({
          connectionId: existingConnection.id,
          tokenPayload: tokenPayload,
          scopes: scopes,
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
          externalAccountMetadata: externalAccountMetadata,
          orgId: orgId,
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
        scopes: scopes,
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
  console.error(`OAuth callback error for ${providerId}:`, error);

  // Try to send failure message if we have an oauth transaction
  try {
    const oauthTransactionResult = await db
      .select()
      .from(oauthTransactions)
      .where(eq(oauthTransactions.state, callbackParams.state))
      .limit(1);
    if (oauthTransactionResult.length > 0) {
      const oauthTransaction = oauthTransactionResult[0]!;
      publishEvents([
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
    console.error(`Failed to send provider failure message: ${wsError}`);
  }

  return {
    status: OauthStatus.Failed as const,
    error: "oauth_callback_failed",
    errorDescription:
      error instanceof Error ? error.message : "Unknown OAuth error",
    provider: providerId,
  };
}

// Helper function to get active provider scopes for a user/org
async function getActiveProviderScopes(
  db: Database,
  orgId: string,
  userId?: string,
): Promise<Set<string>> {
  let whereClause = and(
    eq(connections.orgId, orgId),
    eq(connections.status, ConnectionStatus.Active),
  );

  // If userId is provided, filter for user-scoped tokens as well
  if (userId) {
    whereClause = and(
      whereClause,
      or(
        eq(tokens.ownershipScope, OwnershipScope.Organization),
        and(
          eq(tokens.ownershipScope, OwnershipScope.User),
          eq(tokens.ownerId, userId),
        ),
      ),
    );
  }

  const result = await db
    .select({
      scopes: tokens.scopes,
    })
    .from(connections)
    .innerJoin(tokens, eq(connections.id, tokens.connectionId))
    .where(whereClause);

  return new Set(result.flatMap((r) => r.scopes));
}

// Helper function to check if provider has active connection
async function hasActiveConnection(
  db: Database,
  orgId: string,
  providerId: string,
): Promise<boolean> {
  const result = await db
    .select({ id: connections.id })
    .from(connections)
    .where(
      and(
        eq(connections.orgId, orgId),
        eq(connections.providerId, providerId),
        eq(connections.status, ConnectionStatus.Active),
      ),
    )
    .limit(1);

  return result.length > 0;
}

export async function oauthRoutes(app: FastifyTypeBox) {
  // Register schemas
  app.addSchema(OAuthSuccessResponseSchema);
  app.addSchema(OAuthErrorResponseSchema);
  app.addSchema(OAuthAuditEndpointSchema.response["200"]);

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
      const { orgId, scopes } = request.query;
      const { provider: providerId } = request.params;
      //const baseUrl = process.env.REDIRECT_BASE_URL!;
      const baseUrl = "https://connect-hub.staging.clancy.systems";
      const { userId } = getAuth(request);
      if (!userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "User not authenticated",
        });
      }

      try {
        // Get provider
        const provider = registry.getProvider(providerId);
        if (!provider) {
          return reply.status(400).send({
            error: "Provider not found",
            message: `Provider ${providerId} not found`,
          });
        }
        if (!provider.generateAuthUrl) {
          return reply.status(400).send({
            error: "Provider does not support OAuth",
            message: `Provider ${providerId} does not implement OAuth flow`,
          });
        }

        // Map internal Clancy scopes to provider-native scopes using scopeMapping
        const providerScopes = scopes.flatMap((internalScope) => {
          const mappedScopes = provider.scopeMapping[internalScope];
          return mappedScopes || []; // fallback to original scope if no mapping exists
        });

        // Remove duplicates
        const uniqueProviderScopes = [...new Set(providerScopes)];

        const redirectUri = `${baseUrl}/oauth/callback/${providerId}`;
        const state = crypto.randomUUID();
        await request.server.db.insert(oauthTransactions).values({
          orgId: orgId,
          userId: userId!,
          state: state,
          provider: providerId,
          requestedScopes: uniqueProviderScopes,
          redirectUri: redirectUri,
          status: OauthStatus.Pending,
        });

        const providerSecrets =
          await request.server.getProviderSecrets(providerId);
        if (!providerSecrets) {
          return reply.status(400).send({
            error: "Provider not found",
            message: `Provider ${providerId} not found`,
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
          error: "OAuth launch failed",
          message: error instanceof Error ? error.message : "Unknown error",
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
          oauthContext.orgId,
          providerId,
        );
        publishEvents([
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

        return reply.redirect(`https://app.clancyai.com/`);
      } catch (error) {
        const errorResponse = await handleCallbackError(
          app.db,
          providerId,
          callbackParams,
          error,
        );
        return reply.status(400).send(errorResponse);
      }
    },
  );

  // OAuth Audit - Analyze required vs available scopes for capabilities and triggers
  app.post(
    "/oauth/audit",
    {
      schema: OAuthAuditEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof OAuthAuditEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof OAuthAuditEndpointSchema>,
    ) => {
      const { orgId } = request.query;
      const { capabilities, triggers } = request.body;
      const { userId } = getAuth(request);

      try {
        // Get current active scopes for the user/org
        const activeScopes = await getActiveProviderScopes(
          app.db,
          orgId,
          userId || undefined,
        );

        // Group requests by provider
        const providerRequirements = new Map<
          string,
          {
            requiredScopes: Set<string>;
            needsConnection: boolean;
            capabilities: Array<{ providerId: string; capabilityId: string }>;
            triggers: Array<{ providerId: string; triggerId: string }>;
          }
        >();

        // Process capabilities
        for (const capReq of capabilities) {
          const { providerId, capabilityId } = capReq;
          if (providerId === "internal") {
            continue;
          }

          try {
            const provider = registry.getProvider(providerId);
            if (!provider) {
              continue; // Skip unknown providers
            }

            const capability = provider.getCapability(capabilityId);
            if (!capability) {
              continue; // Skip unknown capabilities
            }

            if (!providerRequirements.has(providerId)) {
              providerRequirements.set(providerId, {
                requiredScopes: new Set(),
                needsConnection: false,
                capabilities: [],
                triggers: [],
              });
            }

            const providerReq = providerRequirements.get(providerId)!;
            providerReq.capabilities.push(capReq);

            // Add required scopes
            for (const scope of capability.meta.requiredScopes) {
              providerReq.requiredScopes.add(scope);
            }
          } catch (error) {
            // Skip if capability not found
            console.warn(
              `Capability ${capabilityId} not found for provider ${providerId}`,
            );
            continue;
          }
        }

        // Process triggers
        for (const triggerReq of triggers) {
          const { providerId, triggerId } = triggerReq;
          if (providerId === "internal") {
            continue;
          }

          try {
            const provider = registry.getProvider(providerId);
            if (!provider) {
              continue; // Skip unknown providers
            }

            const trigger = provider.getTrigger?.(triggerId);
            if (!trigger) {
              continue; // Skip unknown triggers
            }

            if (!providerRequirements.has(providerId)) {
              providerRequirements.set(providerId, {
                requiredScopes: new Set(),
                needsConnection: true,
                capabilities: [],
                triggers: [],
              });
            }

            const providerReq = providerRequirements.get(providerId)!;
            providerReq.triggers.push(triggerReq);
            providerReq.needsConnection = true;
          } catch (error) {
            // Skip if trigger not found
            console.warn(
              `Trigger ${triggerId} not found for provider ${providerId}`,
            );
            continue;
          }
        }

        // Generate audit results
        const auditResults: OAuthAuditProviderResult[] = [];
        const baseUrl = process.env.REDIRECT_BASE_URL!;

        for (const [providerId, requirements] of providerRequirements) {
          const provider = registry.getProvider(providerId);
          if (!provider) {
            continue;
          }

          // Check if there's at least one active connection for this provider
          const hasConnection = await hasActiveConnection(
            app.db,
            orgId,
            providerId,
          );

          // Determine which requested capabilities still need authorisation
          const missingCapabilities: string[] = [];

          for (const capReq of requirements.capabilities) {
            const capability = provider.getCapability(capReq.capabilityId);
            if (!capability) {
              continue;
            }

            // capability.meta.requiredScopes are provider-native scopes.
            // Evaluate them only internally.
            const requiredProviderScopes: string[] =
              capability.meta.requiredScopes;
            const fullyAuthorised = requiredProviderScopes.every((scope) =>
              activeScopes.has(scope),
            );

            if (!fullyAuthorised) {
              missingCapabilities.push(capReq.capabilityId);
            }
          }

          // Decide status & scopes param to request (internal capability IDs only)
          let status: "connected" | "needs_auth" | "needs_scope_upgrade";
          let message: string | undefined;
          let scopesToRequestInternal: string[] = [];

          if (requirements.needsConnection && !hasConnection) {
            status = "needs_auth";
            message = "Connection required for triggers";
            // Request every capability for this provider to ensure a full token
            scopesToRequestInternal = requirements.capabilities.map(
              (c) => c.capabilityId,
            );
          } else if (missingCapabilities.length > 0) {
            status = "needs_scope_upgrade";
            message = `Missing capabilities: ${missingCapabilities.join(", ")}`;
            scopesToRequestInternal = missingCapabilities;
          } else {
            // Everything already authorised – nothing to report for this provider
            continue;
          }

          // Build OAuth launch URL with repeated "scopes" params so Fastify parses them as an array
          const searchParams = new URLSearchParams({ orgId });
          for (const capId of scopesToRequestInternal) {
            searchParams.append("scopes", capId);
          }

          const oauthUrl = `${baseUrl}/oauth/launch/${providerId}?${searchParams.toString()}`;

          auditResults.push({
            providerId,
            providerDisplayName: provider.metadata.displayName,
            providerIcon: provider.metadata.icon,
            status,
            missingScopes: scopesToRequestInternal,
            oauthUrl,
            message,
          });
        }

        return reply.status(200).send(auditResults);
      } catch (error) {
        app.log.error("OAuth audit failed:", error);
        return reply.status(400).send({
          error: "OAuth audit failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}
