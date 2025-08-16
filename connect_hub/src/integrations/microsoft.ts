import {
  ProviderRuntime,
  Capability,
  CapabilityMeta,
  CapabilityFactory,
  CapabilityRisk,
  OAuthAuthUrlParams,
  OAuthCallbackParams,
  OAuthContext,
  CallbackResult,
} from "../providers/types.js";
import { BaseProvider } from "../providers/base.js";
import { ProviderKind, ProviderAuth } from "../models/providers.js";
import { OwnershipScope } from "../models/shared.js";
import { ClientSecretCredential } from "@azure/identity";

// Import service modules
import {
  mailSend,
  mailMessagesList,
  mailSendParamsSchema,
  mailSendResultSchema,
  mailMessagesListParamsSchema,
  mailMessagesListResultSchema,
  MailSendParams,
  MailSendResult,
  MailMessagesListParams,
  MailMessagesListResult,
} from "./microsoft/mail.js";
import {
  calendarEventCreate,
  calendarEventsList,
  calendarEventCreateParamsSchema,
  calendarEventCreateResultSchema,
  calendarEventsListParamsSchema,
  calendarEventsListResultSchema,
  CalendarEventCreateParams,
  CalendarEventCreateResult,
  CalendarEventsListParams,
  CalendarEventsListResult,
} from "./microsoft/calendar.js";
import {
  usersList,
  userProfileGet,
  usersListParamsSchema,
  usersListResultSchema,
  userProfileGetParamsSchema,
  userProfileGetResultSchema,
  UsersListParams,
  UsersListResult,
  UserProfileGetParams,
  UserProfileGetResult,
} from "./microsoft/users.js";

const __dirname = import.meta.dirname;

// ---------------------------------------------------------------------------
// Capability Factory Functions
// ---------------------------------------------------------------------------

function createMailSendCapability(): Capability<
  MailSendParams,
  MailSendResult
> {
  const meta: CapabilityMeta = {
    id: "mail.send",
    displayName: "Send Email",
    description: "Send an email via Microsoft Graph",
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/user-sendmail",
    paramsSchema: mailSendParamsSchema,
    resultSchema: mailSendResultSchema,
    requiredScopes: ["https://graph.microsoft.com/.default"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.HIGH, // External communication impact
  };

  return {
    meta,
    execute: mailSend,
  };
}

function createMailMessagesListCapability(): Capability<
  MailMessagesListParams,
  MailMessagesListResult
> {
  const meta: CapabilityMeta = {
    id: "mail.messages.list",
    displayName: "List Email Messages",
    description: "List email messages from a mailbox",
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/user-list-messages",
    paramsSchema: mailMessagesListParamsSchema,
    resultSchema: mailMessagesListResultSchema,
    requiredScopes: ["https://graph.microsoft.com/.default"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW, // Read-only operation
  };

  return {
    meta,
    execute: mailMessagesList,
  };
}

function createCalendarEventCreateCapability(): Capability<
  CalendarEventCreateParams,
  CalendarEventCreateResult
> {
  const meta: CapabilityMeta = {
    id: "calendar.event.create",
    displayName: "Create Calendar Event",
    description: "Create a calendar event",
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/user-post-events",
    paramsSchema: calendarEventCreateParamsSchema,
    resultSchema: calendarEventCreateResultSchema,
    requiredScopes: ["https://graph.microsoft.com/.default"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.MEDIUM, // Creates internal resource
  };

  return {
    meta,
    execute: calendarEventCreate,
  };
}

function createCalendarEventsListCapability(): Capability<
  CalendarEventsListParams,
  CalendarEventsListResult
> {
  const meta: CapabilityMeta = {
    id: "calendar.events.list",
    displayName: "List Calendar Events",
    description: "List calendar events",
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/user-list-events",
    paramsSchema: calendarEventsListParamsSchema,
    resultSchema: calendarEventsListResultSchema,
    requiredScopes: ["https://graph.microsoft.com/.default"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW, // Read-only operation
  };

  return {
    meta,
    execute: calendarEventsList,
  };
}

function createUsersListCapability(): Capability<
  UsersListParams,
  UsersListResult
> {
  const meta: CapabilityMeta = {
    id: "users.list",
    displayName: "List Users",
    description: "List users in the organization",
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/user-list",
    paramsSchema: usersListParamsSchema,
    resultSchema: usersListResultSchema,
    requiredScopes: ["https://graph.microsoft.com/.default"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW, // Read-only operation
  };

  return {
    meta,
    execute: usersList,
  };
}

function createUserProfileGetCapability(): Capability<
  UserProfileGetParams,
  UserProfileGetResult
> {
  const meta: CapabilityMeta = {
    id: "user.profile.get",
    displayName: "Get User Profile",
    description: "Get a user's profile information",
    docsUrl: "https://docs.microsoft.com/en-us/graph/api/user-get",
    paramsSchema: userProfileGetParamsSchema,
    resultSchema: userProfileGetResultSchema,
    requiredScopes: ["https://graph.microsoft.com/.default"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW, // Read-only operation
  };

  return {
    meta,
    execute: userProfileGet,
  };
}

// ---------------------------------------------------------------------------
// Provider Class
// ---------------------------------------------------------------------------
export class MicrosoftProvider extends BaseProvider {
  constructor() {
    super({
      metadata: {
        id: "microsoft",
        displayName: "Microsoft 365",
        description:
          "Microsoft 365 productivity and collaboration platform via Microsoft Graph",
        icon: "https://developer.microsoft.com/en-us/graph/graph/images/graph-logo.png",
        docsUrl: "https://docs.microsoft.com/en-us/graph/",
        kind: ProviderKind.External,
        auth: ProviderAuth.OAuth2,
      },
      capabilityFactories: {
        "mail.send": createMailSendCapability,
        "mail.messages.list": createMailMessagesListCapability,
        "calendar.event.create": createCalendarEventCreateCapability,
        "calendar.events.list": createCalendarEventsListCapability,
        "users.list": createUsersListCapability,
        "user.profile.get": createUserProfileGetCapability,
      },
      links: [
        "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
        "https://docs.microsoft.com/en-us/graph/permissions-reference",
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // OAuth 2.0 Client Credentials Flow Implementation
  // ---------------------------------------------------------------------------

  generateAuthUrl(params: OAuthAuthUrlParams, ctx: OAuthContext): string {
    // For client credentials flow, we typically don't generate auth URLs for end users
    // This would be used for admin consent flows
    const authority = `https://login.microsoftonline.com/${ctx.providerSecrets.tenant_id}`;
    const authUrl = new URL(`${authority}/adminconsent`);

    authUrl.searchParams.append(
      "client_id",
      ctx.providerSecrets.client_id as string,
    );
    authUrl.searchParams.append("state", params.state);
    authUrl.searchParams.append("redirect_uri", ctx.redirectUri);

    // For Microsoft Graph, we typically request .default scope for app permissions
    const scopes = params.scopes.includes(
      "https://graph.microsoft.com/.default",
    )
      ? params.scopes
      : ["https://graph.microsoft.com/.default"];

    authUrl.searchParams.append("scope", scopes.join(" "));

    return authUrl.toString();
  }

  async handleCallback(
    callbackParams: OAuthCallbackParams,
    ctx: OAuthContext,
  ): Promise<CallbackResult> {
    if (callbackParams.error) {
      throw new Error(
        `OAuth error: ${callbackParams.error_description || callbackParams.error}`,
      );
    }
    const credential = new ClientSecretCredential(
      ctx.providerSecrets.tenant_id as string,
      ctx.providerSecrets.client_id as string,
      ctx.providerSecrets.client_secret as string,
    );

    const tokenResponse = await credential.getToken(
      "https://graph.microsoft.com/.default",
    );

    if (!tokenResponse) {
      throw new Error("Failed to acquire access token");
    }

    // Extract tenant information for connection identification
    const externalAccountMetadata = {
      tenantId: ctx.providerSecrets.tenant_id as string,
      clientId: ctx.providerSecrets.client_id as string,
      authMethod: "client_credentials",
    };

    return {
      tokenPayload: {
        access_token: tokenResponse.token,
        token_type: "Bearer",
        expires_in: Math.floor(
          (tokenResponse.expiresOnTimestamp - Date.now()) / 1000,
        ),
        scope: "https://graph.microsoft.com/.default",
      },
      scopes: ["https://graph.microsoft.com/.default"],
      externalAccountMetadata,
    };
  }
  catch(error: any) {
    throw new Error(`Microsoft OAuth token exchange failed: ${error.message}`);
  }

  async refreshToken(
    tokenPayload: Record<string, unknown>,
    ctx: OAuthContext,
    instanceDomain?: string,
  ): Promise<Record<string, unknown>> {
    // For client credentials flow, we don't use refresh tokens
    // Instead, we request a new token directly
    const result = await this.handleCallback({} as OAuthCallbackParams, ctx);
    return result.tokenPayload as Record<string, unknown>;
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      // Simple validation by making a minimal Graph API call
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Helper Methods
  // ---------------------------------------------------------------------------
}
