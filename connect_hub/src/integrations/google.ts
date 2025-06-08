import {
  ProviderRuntime,
  Capability,
  CapabilityMeta,
  OAuthAuthUrlParams,
  OAuthCallbackParams,
  OAuthContext,
  CallbackResult,
  CapabilityFactory,
  CapabilityRisk,
} from "../providers/types.js";
import { ProviderKind, ProviderAuth } from "../models/capabilities.js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Import Gmail functions and schemas
import {
  gmailSend,
  gmailSearch,
  gmailSendParamsSchema,
  gmailSendResultSchema,
  gmailSearchParamsSchema,
  gmailSearchResultSchema,
  gmailLabelsCreate,
  gmailLabelsList,
  gmailLabelsGet,
  gmailLabelsCreateParamsSchema,
  gmailLabelsCreateResultSchema,
  gmailLabelsListParamsSchema,
  gmailLabelsListResultSchema,
  gmailLabelsGetParamsSchema,
  gmailLabelsGetResultSchema,
  gmailMessagesAttachmentsGet,
  gmailMessagesAttachmentsGetParamsSchema,
  gmailMessagesAttachmentsGetResultSchema,
  gmailDraftsCreate,
  gmailDraftsList,
  gmailDraftsGet,
  gmailDraftsSend,
  gmailDraftsCreateParamsSchema,
  gmailDraftsCreateResultSchema,
  gmailDraftsListParamsSchema,
  gmailDraftsListResultSchema,
  gmailDraftsGetParamsSchema,
  gmailDraftsGetResultSchema,
  gmailDraftsSendParamsSchema,
  gmailDraftsSendResultSchema,
} from "./google/gmail.js";

// Import Calendar functions and schemas
import {
  calendarEventCreate,
  calendarEventsList,
  calendarEventCreateParamsSchema,
  calendarEventCreateResultSchema,
  calendarEventsListParamsSchema,
  calendarEventsListResultSchema,
} from "./google/calendar.js";

// Import Drive functions and schemas
import {
  driveDrivesList,
  driveDrivesGet,
  driveFilesList,
  driveFilesGet,
  driveFilesCreate,
  driveFilesUpdate,
  driveFilesExport,
  driveFilesDownload,
  driveCommentsList,
  driveCommentsGet,
  driveCommentsCreate,
  driveDrivesListParamsSchema,
  driveDrivesListResultSchema,
  driveDrivesGetParamsSchema,
  driveDrivesGetResultSchema,
  driveFilesListParamsSchema,
  driveFilesListResultSchema,
  driveFilesGetParamsSchema,
  driveFilesGetResultSchema,
  driveFilesCreateParamsSchema,
  driveFilesCreateResultSchema,
  driveFilesUpdateParamsSchema,
  driveFilesUpdateResultSchema,
  driveFilesExportParamsSchema,
  driveFilesExportResultSchema,
  driveFilesDownloadParamsSchema,
  driveFilesDownloadResultSchema,
  driveCommentsListParamsSchema,
  driveCommentsListResultSchema,
  driveCommentsGetParamsSchema,
  driveCommentsGetResultSchema,
  driveCommentsCreateParamsSchema,
  driveCommentsCreateResultSchema,
} from "./google/drive.js";
import { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";

const __dirname = import.meta.dirname;

// Gmail capability factory functions
function createGmailSendCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.send",
    displayName: "Send Email",
    description: "Send an email via Gmail",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send",
    paramsSchema: gmailSendParamsSchema,
    resultSchema: gmailSendResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: gmailSend };
}

function createGmailSearchCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.search",
    displayName: "Search Emails",
    description: "Search for emails using Gmail query syntax",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list",
    paramsSchema: gmailSearchParamsSchema,
    resultSchema: gmailSearchResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailSearch };
}

function createGmailLabelsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.labels.create",
    displayName: "Create Gmail Label",
    description: "Create a new Gmail label",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.labels/create",
    paramsSchema: gmailLabelsCreateParamsSchema,
    resultSchema: gmailLabelsCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: gmailLabelsCreate };
}

function createGmailLabelsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.labels.list",
    displayName: "List Gmail Labels",
    description: "List all Gmail labels",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list",
    paramsSchema: gmailLabelsListParamsSchema,
    resultSchema: gmailLabelsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailLabelsList };
}

function createGmailLabelsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.labels.get",
    displayName: "Get Gmail Label",
    description: "Get a specific Gmail label by ID",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.labels/get",
    paramsSchema: gmailLabelsGetParamsSchema,
    resultSchema: gmailLabelsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailLabelsGet };
}

function createGmailAttachmentsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.attachments.get",
    displayName: "Get Gmail Message Attachment",
    description: "Get an attachment from a Gmail message",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.messages.attachments/get",
    paramsSchema: gmailMessagesAttachmentsGetParamsSchema,
    resultSchema: gmailMessagesAttachmentsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailMessagesAttachmentsGet };
}

function createGmailDraftsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.create",
    displayName: "Create Gmail Draft",
    description: "Create a new Gmail draft",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/create",
    paramsSchema: gmailDraftsCreateParamsSchema,
    resultSchema: gmailDraftsCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.compose"],
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: gmailDraftsCreate };
}

function createGmailDraftsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.list",
    displayName: "List Gmail Drafts",
    description: "List Gmail drafts",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/list",
    paramsSchema: gmailDraftsListParamsSchema,
    resultSchema: gmailDraftsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailDraftsList };
}

function createGmailDraftsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.get",
    displayName: "Get Gmail Draft",
    description: "Get a specific Gmail draft by ID",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/get",
    paramsSchema: gmailDraftsGetParamsSchema,
    resultSchema: gmailDraftsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailDraftsGet };
}

function createGmailDraftsSendCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.send",
    displayName: "Send Gmail Draft",
    description: "Send a Gmail draft",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/send",
    paramsSchema: gmailDraftsSendParamsSchema,
    resultSchema: gmailDraftsSendResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: gmailDraftsSend };
}

// Calendar capability factory functions
function createCalendarEventsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "calendar.events.create",
    displayName: "Create Calendar Event",
    description: "Create a new calendar event",
    docsUrl: "https://developers.google.com/calendar/api/v3/reference/events/insert",
    paramsSchema: calendarEventCreateParamsSchema,
    resultSchema: calendarEventCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/calendar"],
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: calendarEventCreate };
}

function createCalendarEventsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "calendar.events.list",
    displayName: "List Calendar Events",
    description: "List events from a calendar",
    docsUrl: "https://developers.google.com/calendar/api/v3/reference/events/list",
    paramsSchema: calendarEventsListParamsSchema,
    resultSchema: calendarEventsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: calendarEventsList };
}

// Drive capability factory functions
function createDriveDrivesListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.drives.list",
    displayName: "List Drives",
    description: "List Google Drives (shared drives)",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/drives/list",
    paramsSchema: driveDrivesListParamsSchema,
    resultSchema: driveDrivesListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveDrivesList };
}

function createDriveDrivesGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.drives.get",
    displayName: "Get Drive",
    description: "Get information about a specific Google Drive",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/drives/get",
    paramsSchema: driveDrivesGetParamsSchema,
    resultSchema: driveDrivesGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveDrivesGet };
}

function createDriveFilesListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.list",
    displayName: "List Files",
    description: "List files and folders in Google Drive",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/files/list",
    paramsSchema: driveFilesListParamsSchema,
    resultSchema: driveFilesListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesList };
}

function createDriveFilesGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.get",
    displayName: "Get File",
    description: "Get information about a specific file in Google Drive",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/files/get",
    paramsSchema: driveFilesGetParamsSchema,
    resultSchema: driveFilesGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesGet };
}

function createDriveFilesCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.create",
    displayName: "Create File",
    description: "Create a new file or folder in Google Drive",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/files/create",
    paramsSchema: driveFilesCreateParamsSchema,
    resultSchema: driveFilesCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: driveFilesCreate };
}

function createDriveFilesUpdateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.update",
    displayName: "Update File",
    description: "Update an existing file in Google Drive",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/files/update",
    paramsSchema: driveFilesUpdateParamsSchema,
    resultSchema: driveFilesUpdateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: driveFilesUpdate };
}

function createDriveFilesExportCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.export",
    displayName: "Export File",
    description: "Export a Google Workspace document in a specific format",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/files/export",
    paramsSchema: driveFilesExportParamsSchema,
    resultSchema: driveFilesExportResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesExport };
}

function createDriveFilesDownloadCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.download",
    displayName: "Download File",
    description: "Download the content of a file from Google Drive",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/files/get",
    paramsSchema: driveFilesDownloadParamsSchema,
    resultSchema: driveFilesDownloadResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesDownload };
}

function createDriveCommentsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.list",
    displayName: "List Comments",
    description: "List comments on a Google Drive file",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/comments/list",
    paramsSchema: driveCommentsListParamsSchema,
    resultSchema: driveCommentsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveCommentsList };
}

function createDriveCommentsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.get",
    displayName: "Get Comment",
    description: "Get a specific comment on a Google Drive file",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/comments/get",
    paramsSchema: driveCommentsGetParamsSchema,
    resultSchema: driveCommentsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveCommentsGet };
}

function createDriveCommentsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.create",
    displayName: "Create Comment",
    description: "Add a comment to a Google Drive file",
    docsUrl: "https://developers.google.com/drive/api/reference/rest/v3/comments/create",
    paramsSchema: driveCommentsCreateParamsSchema,
    resultSchema: driveCommentsCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: driveCommentsCreate };
}

// ---------------------------------------------------------------------------
// Google Provider
// ---------------------------------------------------------------------------
export class GoogleProvider implements ProviderRuntime {
  private readonly dispatchTable = new Map<string, Capability>();
  public readonly scopeMapping: Record<string, string[]>;

  public readonly metadata = {
    id: "google",
    displayName: "Google Workspace",
    description: "Integrated Google productivity and collaboration tools",
    icon: "https://developers.google.com/identity/images/g-logo.png",
    docsUrl: "https://developers.google.com/workspace",
    kind: ProviderKind.External,
    auth: ProviderAuth.OAuth2,
  } as const;

  constructor() {
    // Define capability factories
    const capabilityFactories: Record<string, CapabilityFactory> = {
      // Gmail capabilities
      "gmail.messages.send": createGmailSendCapability,
      "gmail.messages.search": createGmailSearchCapability,
      "gmail.labels.create": createGmailLabelsCreateCapability,
      "gmail.labels.list": createGmailLabelsListCapability,
      "gmail.labels.get": createGmailLabelsGetCapability,
      "gmail.messages.attachments.get": createGmailAttachmentsGetCapability,
      "gmail.drafts.create": createGmailDraftsCreateCapability,
      "gmail.drafts.list": createGmailDraftsListCapability,
      "gmail.drafts.get": createGmailDraftsGetCapability,
      "gmail.drafts.send": createGmailDraftsSendCapability,
      // Calendar capabilities
      "calendar.events.create": createCalendarEventsCreateCapability,
      "calendar.events.list": createCalendarEventsListCapability,
      // Drive capabilities
      "drive.drives.list": createDriveDrivesListCapability,
      "drive.drives.get": createDriveDrivesGetCapability,
      "drive.files.list": createDriveFilesListCapability,
      "drive.files.get": createDriveFilesGetCapability,
      "drive.files.create": createDriveFilesCreateCapability,
      "drive.files.update": createDriveFilesUpdateCapability,
      "drive.files.export": createDriveFilesExportCapability,
      "drive.files.download": createDriveFilesDownloadCapability,
      "drive.comments.list": createDriveCommentsListCapability,
      "drive.comments.get": createDriveCommentsGetCapability,
      "drive.comments.create": createDriveCommentsCreateCapability,
    };

    // Populate dispatch table
    for (const [capabilityId, factory] of Object.entries(capabilityFactories)) {
      this.dispatchTable.set(capabilityId, factory());
    }

    // Generate scopeMapping from dispatch table
    this.scopeMapping = {};
    for (const [capabilityId, capability] of this.dispatchTable) {
      for (const scope of capability.meta.requiredScopes) {
        if (!this.scopeMapping[scope]) {
          this.scopeMapping[scope] = [];
        }
        this.scopeMapping[scope].push(scope);
      }
    }
  }

  getCapability<P, R>(capId: string): Capability<P, R> {
    const capability = this.dispatchTable.get(capId);
    if (!capability) {
      throw new Error(`Google capability ${capId} not implemented`);
    }
    return capability as Capability<P, R>;
  }

  listCapabilities() {
    return Array.from(this.dispatchTable.values()).map((c) => c.meta);
  }

  // OAuth methods implementation
  generateAuthUrl(params: OAuthAuthUrlParams, ctx: OAuthContext): string {
    const oauth2Client = new google.auth.OAuth2(
      ctx.clientId,
      ctx.clientSecret,
      ctx.redirectUri,
    );
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: params.scopes,
      state: params.state,
    });
  }

  async handleCallback(
    callbackParams: OAuthCallbackParams,
    ctx: OAuthContext,
  ): Promise<CallbackResult> {
    const oauth2Client = new google.auth.OAuth2(
      ctx.clientId,
      ctx.clientSecret,
      ctx.redirectUri,
    );
    const { tokens } = await oauth2Client.getToken(callbackParams.code);
    return {
      tokenPayload: tokens as Record<string, unknown>,
      scopes: tokens.scope?.split(" ") || [],
      externalAccountMetadata: {},
    };
  }

  //async refreshToken(
  //  tokenPayload: Record<string, unknown>,
  //  ctx: OAuthContext,
  //): Promise<Record<string, unknown>> {
  //  const oauth2Client = new google.auth.OAuth2(
  //    ctx.clientId,
  //    ctx.clientSecret,
  //    ctx.redirectUri,
  //  );
  //  const { credentials } = await oauth2Client.refreshAccessToken();
  //  if (!credentials.access_token || !credentials.refresh_token) {
  //    throw new Error("Invalid tokens");
  //  }
  //  return {
  //    accessToken: credentials.access_token,
  //    refreshToken: credentials.refresh_token,
  //    expiresAt: new Date(credentials.expiry_date || 0),
  //    grantedScopes: credentials.scope?.split(" ") || [],
  //  };
  //}

  async isTokenValid(accessToken: string): Promise<boolean> {
    try {
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      
      // Make a simple API call to verify the token
      const oauth2 = google.oauth2({
        version: "v2",
        auth: oauth2Client,
      });
      await oauth2.userinfo.get();
      
      return true;
    } catch (error) {
      return false;
    }
  }
  //webhookRegistrations(): WebhookRegistration[] {
  //  return [{
  //    eventSchema: Type.Object({
  //      type: Type.Literal("gmail.messages.create"),
  //      data: Type.Object({
  //        message: Type.Object({
  //          id: Type.String(),
  //          threadId: Type.String(),
  //        }),
  //      }),
  //    }),
  //    handler: async (request, reply) => {
  //      console.log("Webhook received", JSON.stringify(request.body));
  //    },
  //  }];
  //}

}
