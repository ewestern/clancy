import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import type {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.js";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import {
  OAuthNeedsEndpointSchema,
  OAuthLaunchEndpointSchema,
  OAuthCallbackEndpointSchema,
  OAuthSuccessResponseSchema,
  OAuthErrorResponseSchema,
  OauthNeedsStatus,
  OauthStatus,
} from "../models/oauth.js";
import { registry } from "../integrations.js";
import {
  connections,
  tokens,
  oauthTransactions,
} from "../database/schema.js";
import { ConnectionStatus } from "../models/connection.js";
import { OAuthContext } from "../providers/types.js";




export async function oauthRoutes(app: FastifyTypeBox) {
  // Register schemas
  app.addSchema(OAuthSuccessResponseSchema);
  app.addSchema(OAuthErrorResponseSchema);

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
      const baseUrl = request.server.baseUrl;

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
          return mappedScopes || [internalScope]; // fallback to original scope if no mapping exists
        });
        console.log("providerScopes", providerScopes);

        // Remove duplicates
        const uniqueProviderScopes = [...new Set(providerScopes)];

        const redirectUri = `${baseUrl}/oauth/callback/${providerId}`;
        const state = crypto.randomUUID();
        await request.server.db.insert(oauthTransactions).values({
          orgId: orgId,
          state: state,
          provider: providerId,
          requestedScopes: uniqueProviderScopes,
          redirectUri: redirectUri,
          status: OauthStatus.Pending,
        });

        const providerMetadata = await request.server.getProviderMetadata(providerId);
        if (!providerMetadata) {
          return reply.status(400).send({
            error: "Provider not found",
            message: `Provider ${providerId} not found`,
          });
        }

        const oauthContext: OAuthContext = {
          orgId: orgId,
          provider: providerId,
          clientId: providerMetadata.clientId,
          clientSecret: providerMetadata.clientSecret,
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

      const providerMetadata = await request.server.getProviderMetadata(providerId);
      if (!providerMetadata) {
        return reply.status(400).send({
          status: OauthStatus.Failed,
          error: "provider_not_found",
          errorDescription: `Provider ${providerId} not found`,
          provider: providerId,
        });
      }

      const oauthTransactionResult = await app.db
        .select()
        .from(oauthTransactions)
        .where(eq(oauthTransactions.state, callbackParams.state))
        .limit(1);
      if (oauthTransactionResult.length === 0) {
        return reply.status(400).send({
          status: OauthStatus.Failed,
          error: "invalid_state",
          errorDescription: `Invalid state: ${callbackParams.state}`,
          provider: providerId,
        });
      }

      const oauthTransaction = oauthTransactionResult[0];

      const oauthContext: OAuthContext = {
        orgId: oauthTransaction.orgId,
        provider: providerId,
        clientId: providerMetadata.clientId,
        clientSecret: providerMetadata.clientSecret,
        signingSecret: providerMetadata.signingSecret,
        redirectUri: `${request.server.baseUrl}/oauth/callback/${providerId}`,
      };
      const provider = registry.getProvider(providerId);
      if (!provider) {
        return reply.status(400).send({
          status: OauthStatus.Failed,
          error: "provider_not_found",
          errorDescription: `Provider ${providerId} not found`,
          provider: providerId,
        });
      }
      if (!provider.handleCallback) {
        return reply.status(400).send({
          status: OauthStatus.Failed,
          error: "provider_not_supported",
          errorDescription: `Provider ${providerId} does not support OAuth callbacks`,
          provider: providerId,
        });
      }
      const existingConnectionResponse = await app.db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.orgId, oauthContext.orgId),
            eq(connections.providerId, providerId),
            eq(connections.status, ConnectionStatus.Active),
          ),
        )
        .limit(1);
      const existingConnection = existingConnectionResponse[0] || null;

      const { tokenPayload, scopes, externalAccountMetadata } = await provider.handleCallback(
        callbackParams,
        oauthContext,
      );
      app.db.transaction(async (tx) => {
        if (existingConnection) {
          await tx
            .update(tokens)
            .set({
              tokenPayload: tokenPayload,
              scopes: scopes,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(tokens.connectionId, existingConnection.id));
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
              externalAccountMetadata: externalAccountMetadata,
              orgId: oauthContext.orgId,
              providerId: providerId,
              status: ConnectionStatus.Active,
            })
            .returning();
          await tx.insert(tokens).values({
            connectionId: connection.id,
            tokenPayload: tokenPayload,
            scopes: scopes,
            createdAt: new Date(),
            updatedAt: new Date(),
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
      return reply.redirect(`${request.server.baseUrl}/`);
    },
  );
}
