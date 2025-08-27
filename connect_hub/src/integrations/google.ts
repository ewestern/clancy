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
  Trigger,
  Webhook,
} from "../providers/types.js";
import { BaseProvider } from "../providers/base.js";
import { ProviderKind, ProviderAuth } from "../models/providers.js";
import { google } from "googleapis";

// Import Gmail functions and schemas
import {
  gmailSend,
  gmailSearch,
  gmailMessagesGet,
  gmailSendParamsSchema,
  gmailSendResultSchema,
  gmailSearchParamsSchema,
  gmailSearchResultSchema,
  gmailMessagesGetParamsSchema,
  gmailMessagesGetResultSchema,
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
import { OwnershipScope } from "../models/shared.js";
import { GoogleWebhook, GoogleWebhookEvent } from "./google/webhooks.js";
import {
  gmailMessageReceivedTrigger,
  driveFileChangeTrigger,
  calendarEventsChangeTrigger,
} from "./google/triggers.js";

// Gmail capability factory functions
function createGmailSendCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.send",
    displayName: "Send Email",
    description: "Send an email via Gmail",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send",
    paramsSchema: gmailSendParamsSchema,
    resultSchema: gmailSendResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: gmailSend };
}

function createGmailSearchCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.search",
    displayName: "Search Emails",
    description: "Search for emails using Gmail query syntax",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list",
    paramsSchema: gmailSearchParamsSchema,
    resultSchema: gmailSearchResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailSearch };
}

function createGmailMessagesGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.get",
    displayName: "Get Email",
    description: "Retrieve a specific email message by ID",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get",
    paramsSchema: gmailMessagesGetParamsSchema,
    resultSchema: gmailMessagesGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailMessagesGet };
}

function createGmailLabelsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.labels.create",
    displayName: "Create Gmail Label",
    description: "Create a new Gmail label",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.labels/create",
    paramsSchema: gmailLabelsCreateParamsSchema,
    resultSchema: gmailLabelsCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: gmailLabelsCreate };
}

function createGmailLabelsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.labels.list",
    displayName: "List Gmail Labels",
    description: "List all Gmail labels",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.labels/list",
    paramsSchema: gmailLabelsListParamsSchema,
    resultSchema: gmailLabelsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailLabelsList };
}

function createGmailLabelsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.labels.get",
    displayName: "Get Gmail Label",
    description: "Get a specific Gmail label by ID",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.labels/get",
    paramsSchema: gmailLabelsGetParamsSchema,
    resultSchema: gmailLabelsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.labels"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailLabelsGet };
}

// Add ownershipScope to all remaining capabilities that are missing it

// Gmail attachments - User scope
function createGmailAttachmentsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.attachments.get",
    displayName: "Get Gmail Message Attachment",
    description: "Get an attachment from a Gmail message",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.messages.attachments/get",
    paramsSchema: gmailMessagesAttachmentsGetParamsSchema,
    resultSchema: gmailMessagesAttachmentsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailMessagesAttachmentsGet };
}

// Gmail drafts - User scope
function createGmailDraftsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.create",
    displayName: "Create Gmail Draft",
    description: "Create a new Gmail draft",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/create",
    paramsSchema: gmailDraftsCreateParamsSchema,
    resultSchema: gmailDraftsCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.compose"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: gmailDraftsCreate };
}

function createGmailDraftsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.list",
    displayName: "List Gmail Drafts",
    description: "List Gmail drafts",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/list",
    paramsSchema: gmailDraftsListParamsSchema,
    resultSchema: gmailDraftsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailDraftsList };
}

function createGmailDraftsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.get",
    displayName: "Get Gmail Draft",
    description: "Get a specific Gmail draft by ID",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/get",
    paramsSchema: gmailDraftsGetParamsSchema,
    resultSchema: gmailDraftsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: gmailDraftsGet };
}

function createGmailDraftsSendCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.drafts.send",
    displayName: "Send Gmail Draft",
    description: "Send a Gmail draft",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/send",
    paramsSchema: gmailDraftsSendParamsSchema,
    resultSchema: gmailDraftsSendResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: gmailDraftsSend };
}

// Calendar capabilities - User scope (accessing personal calendar)
function createCalendarEventsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "calendar.events.create",
    displayName: "Create Calendar Event",
    description: "Create a new calendar event",
    docsUrl:
      "https://developers.google.com/calendar/api/v3/reference/events/insert",
    paramsSchema: calendarEventCreateParamsSchema,
    resultSchema: calendarEventCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/calendar"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: calendarEventCreate };
}

function createCalendarEventsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "calendar.events.list",
    displayName: "List Calendar Events",
    description: "List events from a calendar",
    docsUrl:
      "https://developers.google.com/calendar/api/v3/reference/events/list",
    paramsSchema: calendarEventsListParamsSchema,
    resultSchema: calendarEventsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    ownershipScope: OwnershipScope.User,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: calendarEventsList };
}

// Drive capabilities - Shared drives and organization-wide access
function createDriveDrivesListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.drives.list",
    displayName: "List Google Drives",
    description:
      "List shared drives accessible to the user. Requires broad Drive access permissions.",
    docsUrl: "https://developers.google.com/drive/api/v3/reference/drives/list",
    paramsSchema: driveDrivesListParamsSchema,
    resultSchema: driveDrivesListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveDrivesList };
}

function createDriveDrivesGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.drives.get",
    displayName: "Get Drive Information",
    description:
      "Get information about a specific Google Drive. Requires broad Drive access permissions.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/drives/get",
    paramsSchema: driveDrivesGetParamsSchema,
    resultSchema: driveDrivesGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveDrivesGet };
}

// All Files (requires broad Drive access) - for files not created by this app
function createDriveAllFilesListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.list.all",
    displayName: "List All Drive Files",
    description:
      "List all files and folders in Google Drive, including those created by other apps. Requires broad Drive read access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/list",
    paramsSchema: driveFilesListParamsSchema,
    resultSchema: driveFilesListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesList };
}

function createDriveAllFilesGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.get.all",
    displayName: "Get Any Drive File",
    description:
      "Get information about any file in Google Drive, including those created by other apps. Requires broad Drive read access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/get",
    paramsSchema: driveFilesGetParamsSchema,
    resultSchema: driveFilesGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesGet };
}

function createDriveAllFilesUpdateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.update.all",
    displayName: "Update Any Drive File",
    description:
      "Update any existing file in Google Drive, including those created by other apps. Requires broad Drive write access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/update",
    paramsSchema: driveFilesUpdateParamsSchema,
    resultSchema: driveFilesUpdateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: driveFilesUpdate };
}

function createDriveAllFilesExportCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.export.all",
    displayName: "Export Any Drive File",
    description:
      "Export any Google Workspace document in a specific format, including those created by other apps. Requires broad Drive read access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/export",
    paramsSchema: driveFilesExportParamsSchema,
    resultSchema: driveFilesExportResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesExport };
}

function createDriveAllFilesDownloadCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.download.all",
    displayName: "Download Any Drive File",
    description:
      "Download the content of any file from Google Drive, including those created by other apps. Requires broad Drive read access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/get",
    paramsSchema: driveFilesDownloadParamsSchema,
    resultSchema: driveFilesDownloadResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesDownload };
}

function createDriveAllCommentsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.list.all",
    displayName: "List Comments on Any File",
    description:
      "List comments on any Google Drive file, including those created by other apps. Requires broad Drive read access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/comments/list",
    paramsSchema: driveCommentsListParamsSchema,
    resultSchema: driveCommentsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveCommentsList };
}

function createDriveAllCommentsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.get.all",
    displayName: "Get Comment from Any File",
    description:
      "Get a specific comment on any Google Drive file, including those created by other apps. Requires broad Drive read access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/comments/get",
    paramsSchema: driveCommentsGetParamsSchema,
    resultSchema: driveCommentsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.readonly"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveCommentsGet };
}

function createDriveAllCommentsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.create.all",
    displayName: "Comment on Any Drive File",
    description:
      "Add a comment to any Google Drive file, including those created by other apps. Requires broad Drive write access.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/comments/create",
    paramsSchema: driveCommentsCreateParamsSchema,
    resultSchema: driveCommentsCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: driveCommentsCreate };
}

// App Files (per-file access) - for files created by this app or opened with this app
function createDriveAppFilesListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.list.app",
    displayName: "List App-Created Files",
    description:
      "List files and folders created by this app or opened with this app. Uses per-file access permissions for enhanced privacy.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/list",
    paramsSchema: driveFilesListParamsSchema,
    resultSchema: driveFilesListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesList };
}

function createDriveAppFilesGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.get.app",
    displayName: "Get App-Created File",
    description:
      "Get information about a file created by this app or opened with this app. Uses per-file access permissions for enhanced privacy.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/get",
    paramsSchema: driveFilesGetParamsSchema,
    resultSchema: driveFilesGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesGet };
}

function createDriveAppFilesCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.create.app",
    displayName: "Create New File",
    description:
      "Create a new file or folder in Google Drive. Uses per-file access permissions, granting access only to files created by this app.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/create",
    paramsSchema: driveFilesCreateParamsSchema,
    resultSchema: driveFilesCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: driveFilesCreate };
}

function createDriveAppFilesUpdateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.update.app",
    displayName: "Update App-Created File",
    description:
      "Update a file created by this app or opened with this app. Uses per-file access permissions for enhanced privacy.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/update",
    paramsSchema: driveFilesUpdateParamsSchema,
    resultSchema: driveFilesUpdateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: driveFilesUpdate };
}

function createDriveAppFilesExportCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.export.app",
    displayName: "Export App-Created File",
    description:
      "Export a Google Workspace document created by this app or opened with this app in a specific format. Uses per-file access permissions.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/export",
    paramsSchema: driveFilesExportParamsSchema,
    resultSchema: driveFilesExportResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesExport };
}

function createDriveAppFilesDownloadCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.files.download.app",
    displayName: "Download App-Created File",
    description:
      "Download the content of a file created by this app or opened with this app. Uses per-file access permissions for enhanced privacy.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/files/get",
    paramsSchema: driveFilesDownloadParamsSchema,
    resultSchema: driveFilesDownloadResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveFilesDownload };
}

function createDriveAppCommentsListCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.list.app",
    displayName: "List Comments on App Files",
    description:
      "List comments on files created by this app or opened with this app. Uses per-file access permissions for enhanced privacy.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/comments/list",
    paramsSchema: driveCommentsListParamsSchema,
    resultSchema: driveCommentsListResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveCommentsList };
}

function createDriveAppCommentsGetCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.get.app",
    displayName: "Get Comment from App File",
    description:
      "Get a specific comment on a file created by this app or opened with this app. Uses per-file access permissions for enhanced privacy.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/comments/get",
    paramsSchema: driveCommentsGetParamsSchema,
    resultSchema: driveCommentsGetResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.LOW,
  };
  return { meta, execute: driveCommentsGet };
}

function createDriveAppCommentsCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "drive.comments.create.app",
    displayName: "Comment on App Files",
    description:
      "Add a comment to files created by this app or opened with this app. Uses per-file access permissions for enhanced privacy.",
    docsUrl:
      "https://developers.google.com/drive/api/reference/rest/v3/comments/create",
    paramsSchema: driveCommentsCreateParamsSchema,
    resultSchema: driveCommentsCreateResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/drive.file"],
    ownershipScope: OwnershipScope.Organization,
    risk: CapabilityRisk.MEDIUM,
  };
  return { meta, execute: driveCommentsCreate };
}

// ---------------------------------------------------------------------------
// Google Provider
// ---------------------------------------------------------------------------
export class GoogleProvider extends BaseProvider<any, GoogleWebhookEvent> {
  constructor() {
    const triggers = [
      gmailMessageReceivedTrigger,
      driveFileChangeTrigger,
      calendarEventsChangeTrigger,
    ];

    const webhook = new GoogleWebhook(triggers);

    super({
      metadata: {
        id: "google",
        displayName: "Google Workspace",
        description: "Integrated Google productivity and collaboration tools",
        icon: "https://developers.google.com/identity/images/g-logo.png",
        docsUrl: "https://developers.google.com/workspace",
        kind: ProviderKind.External,
        auth: ProviderAuth.OAuth2,
      },
      capabilityFactories: {
        // Gmail capabilities
        "gmail.messages.send": createGmailSendCapability,
        "gmail.messages.search": createGmailSearchCapability,
        "gmail.messages.get": createGmailMessagesGetCapability,
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
        // Drive capabilities - Shared drives
        "drive.drives.list": createDriveDrivesListCapability,
        "drive.drives.get": createDriveDrivesGetCapability,
        // Drive capabilities - All files (broad access)
        "drive.files.list.all": createDriveAllFilesListCapability,
        "drive.files.get.all": createDriveAllFilesGetCapability,
        "drive.files.update.all": createDriveAllFilesUpdateCapability,
        "drive.files.export.all": createDriveAllFilesExportCapability,
        "drive.files.download.all": createDriveAllFilesDownloadCapability,
        "drive.comments.list.all": createDriveAllCommentsListCapability,
        "drive.comments.get.all": createDriveAllCommentsGetCapability,
        "drive.comments.create.all": createDriveAllCommentsCreateCapability,
        // Drive capabilities - App files (per-file access)
        "drive.files.list.app": createDriveAppFilesListCapability,
        "drive.files.get.app": createDriveAppFilesGetCapability,
        "drive.files.create.app": createDriveAppFilesCreateCapability,
        "drive.files.update.app": createDriveAppFilesUpdateCapability,
        "drive.files.export.app": createDriveAppFilesExportCapability,
        "drive.files.download.app": createDriveAppFilesDownloadCapability,
        "drive.comments.list.app": createDriveAppCommentsListCapability,
        "drive.comments.get.app": createDriveAppCommentsGetCapability,
        "drive.comments.create.app": createDriveAppCommentsCreateCapability,
      },
      triggers,
      webhooks: [webhook],
      links: [
        "https://console.cloud.google.com/auth/clients/650222929087-s1f2qid234aa7ajs6mtlccovlvl0ghmb.apps.googleusercontent.com?inv=1&invt=Ab5ZBQ&project=clancy-464816",
        "https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch",
      ],
    });
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
}
