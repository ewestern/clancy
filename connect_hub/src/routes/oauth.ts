import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
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

async function getBestConnection(
  db: Database,
  orgId: string,
  userId: string,
  providerId: string,
) {
  const connectionsResult = await db
    .select()
    .from(connections)
    .where(
      and(
        eq(connections.orgId, orgId),
        eq(connections.userId, userId),
        eq(connections.providerId, providerId),
        eq(connections.status, ConnectionStatus.Active),
      ),
    );
  return connectionsResult[0] || null;
}

// Helper function to update or create connection
async function updateOrCreateConnection(
  db: Database,
  oauthTransaction: typeof oauthTransactions.$inferSelect,
  tokenPayload: Record<string, unknown>,
  externalScopes: string[],
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
      const { token } = request.query;
      const capabilities = request.query.scopes;
      const { provider: providerId } = request.params;
      const baseUrl = process.env.REDIRECT_BASE_URL!;

      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      const userId = payload.sub;
      const orgId = payload.org_id || "";

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
        console.log("capabilities", capabilities);
        console.log("provider", provider.scopeMapping);

        // Map internal Clancy scopes to provider-native scopes using scopeMapping
        const providerScopes = capabilities.flatMap((capability) => {
          const mappedScopes = provider.scopeMapping[capability];
          return mappedScopes || []; // fallback to original scope if no mapping exists
        });
        console.log("providerScopes", providerScopes);

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
        console.log("authUrl", authUrl);
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

        return reply.redirect(`/oauth/success.html`);
      } catch (error) {
        await handleCallbackError(app.db, providerId, callbackParams, error);

        // Redirect to error page with error details in query params
        const errorType = encodeURIComponent("oauth_callback_failed");
        const errorDescription = encodeURIComponent(
          error instanceof Error ? error.message : "Unknown OAuth error",
        );
        return reply.redirect(
          `/oauth/error.html?error=${errorType}&error_description=${errorDescription}`,
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
      if (!userId || !orgId) {
        return reply.status(401).send({
          error: "unauthorized",
          message: "Missing user or organization in auth context",
        } as any);
      }

      // Group requested capabilities and triggers by provider
      const capabilitiesByProvider = new Map<string, Set<string>>();
      for (const item of request.body.capabilities) {
        if (!capabilitiesByProvider.has(item.providerId)) {
          capabilitiesByProvider.set(item.providerId, new Set());
        }
        capabilitiesByProvider.get(item.providerId)!.add(item.capabilityId);
      }
      // For now, triggers do not add additional scopes in audit (providers may extend later)
      // const triggersByProvider = new Map<string, Set<string>>();
      // for (const t of request.body.triggers) { ... }

      // Fetch user's existing tokens per provider
      const providerIds = Array.from(capabilitiesByProvider.keys());
      type ProviderTokenRow = {
        providerId: string;
        scopes: string[] | null;
      };
      const tokenRows: Record<string, ProviderTokenRow | null> = {};
      if (providerIds.length > 0) {
        // For each provider, select the token for this user's connection (if any)
        // Doing N queries keeps logic simple and avoids cartesian complications
        for (const pid of providerIds) {
          const rows = await request.server.db
            .select({
              providerId: connections.providerId,
              scopes: tokens.scopes,
            })
            .from(connections)
            .leftJoin(
              tokens,
              and(
                eq(tokens.connectionId, connections.id),
                eq(tokens.ownershipScope, OwnershipScope.User),
                eq(tokens.ownerId, userId),
              ),
            )
            .where(
              and(
                eq(connections.orgId, orgId),
                eq(connections.userId, userId),
                eq(connections.providerId, pid),
                eq(connections.status, ConnectionStatus.Active),
              ),
            )
            .limit(1);
          tokenRows[pid] = rows[0] || null;
        }
      }

      const results = [] as Array<{
        providerId: string;
        providerDisplayName: string;
        providerIcon: string;
        status: "connected" | "needs_auth" | "needs_scope_upgrade";
        grantedCapabilities: string[];
        missingCapabilities: string[];
        oauthUrl: string;
        message?: string;
      }>;

      for (const pid of providerIds) {
        const provider = registry.getProvider(pid);
        if (!provider) {
          continue;
        }

        // Skip Internal providers - they never need OAuth
        if (provider.metadata.kind === ProviderKind.Internal) {
          continue;
        }

        const requestedCapabilityIds = Array.from(
          capabilitiesByProvider.get(pid) ?? [],
        );

        // Compute required provider-native scopes for requested capabilities
        const requiredProviderScopes = new Set<string>();
        for (const capId of requestedCapabilityIds) {
          const mapped = provider.scopeMapping[capId] || [];
          for (const s of mapped) requiredProviderScopes.add(s);
        }

        // Granted scopes for current user's token (if any)
        const token = tokenRows[pid];
        const grantedScopes = new Set<string>(
          (token?.scopes || []) as string[],
        );

        // Determine status
        let status: "connected" | "needs_auth" | "needs_scope_upgrade";
        if (!token) {
          status = "needs_auth";
        } else if (
          Array.from(requiredProviderScopes).some((s) => !grantedScopes.has(s))
        ) {
          status = "needs_scope_upgrade";
        } else {
          status = "connected";
        }

        // Get capability display names from provider capabilities
        const providerCapabilities = provider.listCapabilities();

        // Determine which capabilities are already satisfied by current grant
        const grantedCapabilities: string[] = [];
        const missingCapabilities: string[] = [];

        for (const capId of requestedCapabilityIds) {
          const capability = providerCapabilities.find(
            (cap) => cap.id === capId,
          );
          const displayName = capability?.displayName || capId;

          const mapped = provider.scopeMapping[capId] || [];
          const fullyGranted =
            mapped.length === 0 || mapped.every((s) => grantedScopes.has(s));

          if (fullyGranted) {
            grantedCapabilities.push(displayName);
          } else {
            missingCapabilities.push(displayName);
          }
        }

        const cumulativeCapabilityIds = new Set<string>();
        // Always include requested (so the user explicitly consents to needs)
        for (const id of requestedCapabilityIds)
          cumulativeCapabilityIds.add(id);

        // Include already granted capability ids so providers that treat scopes as replacement don't drop prior grants
        for (const [capId, mappedScopes] of Object.entries(
          provider.scopeMapping,
        )) {
          if (mappedScopes.length === 0) continue;
          const fullyGranted = mappedScopes.every((s) => grantedScopes.has(s));
          if (fullyGranted) cumulativeCapabilityIds.add(capId);
        }

        // Build launch URL to request cumulative capability ids via our own /oauth/launch route
        const baseUrl = process.env.REDIRECT_BASE_URL!;
        const launchUrl = new URL(`${baseUrl}/oauth/launch/${pid}`);
        
        // Add each scope as a separate parameter so Fastify can deserialize as an array
        for (const scopeId of Array.from(cumulativeCapabilityIds)) {
          launchUrl.searchParams.append("scopes", scopeId);
        }
        

        results.push({
          providerId: pid,
          providerDisplayName: provider.metadata.displayName,
          providerIcon: provider.metadata.icon,
          status,
          grantedCapabilities,
          missingCapabilities,
          oauthUrl: launchUrl.toString(),
          message:
            status === "connected"
              ? "All required capabilities granted"
              : status === "needs_auth"
                ? "No active connection found for this provider"
                : "Additional capabilities are required",
        });
      }

      return reply.status(200).send(results);
    },
  );
}
