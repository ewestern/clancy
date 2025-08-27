import { Type } from "@sinclair/typebox";
import { google } from "googleapis";
import { Database } from "../../plugins/database.js";
import { triggerRegistrations, tokens } from "../../database/schema.js";
import { eq, and } from "drizzle-orm";
import { Trigger } from "../../providers/types.js";
import { TriggerRegistration } from "../../models/triggers.js";
import { GoogleWebhookEvent } from "./webhooks.js";
import { randomUUID } from "crypto";

// Gmail message received trigger
export const gmailMessageReceivedTrigger: Trigger<GoogleWebhookEvent> = {
  id: "gmail.message.received",
  description: "Triggered when a new Gmail message is received",
  requiredScopes: ["https://www.googleapis.com/auth/gmail.metadata"],
  paramsSchema: Type.Object({
    labelIds: Type.Optional(Type.Array(Type.String())),
    query: Type.Optional(Type.String()),
  }),

  async registerSubscription(db, connectionMetadata, triggerRegistration, oauthContext) {
    // Get the user's token
    const token = await db.query.tokens.findFirst({
      where: eq(tokens.connectionId, triggerRegistration.connectionId!),
    });

    if (!token) {
      throw new Error("No token found for connection");
    }

    const oauth2Client = new google.auth.OAuth2({
      clientId: oauthContext.clientId,
      clientSecret: oauthContext.clientSecret,
      redirectUri: oauthContext.redirectUri,
    });
    oauth2Client.setCredentials(token.tokenPayload);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Generate verification token
    const verificationToken = randomUUID();

    // Set up Gmail watch (requires Pub/Sub topic setup)
    const watchResponse = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: `projects/clancy-464816/topics/clancy-connect-hub-${process.env.ENVIRONMENT}`,
        labelIds: triggerRegistration.params.labelIds,
        labelFilterAction: "include",
      },
    });

    const expiresAt = new Date(parseInt(watchResponse.data.expiration!));

    return {
      expiresAt,
      subscriptionMetadata: {
        historyId: watchResponse.data.historyId,
        expiration: watchResponse.data.expiration,
        verificationToken,
        topicName: process.env.GMAIL_PUBSUB_TOPIC,
        labelIds: triggerRegistration.params.labelIds,
        query: triggerRegistration.params.query,
      },
    };
  },

  async getTriggerRegistrations(db, triggerId, event) {
    if (event.type !== "gmail_message") return [];

    // Find registrations for Gmail triggers
    const registrations = await db
      .select()
      .from(triggerRegistrations)
      .where(
        and(
          eq(triggerRegistrations.providerId, "google"),
          eq(triggerRegistrations.triggerId, triggerId),
        ),
      );

    return registrations
      .filter((reg) => {
        // Additional filtering based on Gmail message content if needed
        return true;
      })
      .map((reg) => ({
        ...reg,
        expiresAt: reg.expiresAt.toISOString(),
        createdAt: reg.createdAt.toISOString(),
        updatedAt: reg.updatedAt.toISOString(),
      }));
  },

  async createEvents(event, triggerRegistration) {
    if (event.type !== "gmail_message" || !event.pubsubMessage) {
      return [];
    }

    // Decode Pub/Sub message
    const messageData = JSON.parse(
      Buffer.from(event.pubsubMessage.data, "base64").toString(),
    );

    return [
      {
        event: {
          type: "gmail_message_received",
          messageId: messageData.messageId,
          historyId: messageData.historyId,
          emailAddress: messageData.emailAddress,
          triggerRegistrationId: triggerRegistration.id,
        },
        partitionKey: triggerRegistration.agentId,
      },
    ];
  },

  eventSatisfies(event) {
    return event.type === "gmail_message";
  },
};

// Drive file change trigger
export const driveFileChangeTrigger: Trigger<GoogleWebhookEvent> = {
  id: "drive.files.change",
  description: "Triggered when Drive files are created, modified, or deleted",
  requiredScopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
  paramsSchema: Type.Object({
    driveId: Type.Optional(Type.String()),
    includeRemoved: Type.Optional(Type.Boolean()),
    pageToken: Type.Optional(Type.String()),
  }),

  async registerSubscription(db, connectionMetadata, triggerRegistration) {
    const token = await db.query.tokens.findFirst({
      where: eq(tokens.connectionId, triggerRegistration.connectionId!),
    });

    if (!token) {
      throw new Error("No token found for connection");
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(token.tokenPayload);

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const channelId = randomUUID();
    const verificationToken = randomUUID();

    const watchResponse = await drive.files.watch({
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: `${process.env.WEBHOOK_BASE_URL}/webhooks/google`,
        token: verificationToken,
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 7 days
      },
    });

    const expiresAt = new Date(parseInt(watchResponse.data.expiration!));

    return {
      expiresAt,
      subscriptionMetadata: {
        channelId: watchResponse.data.id,
        resourceId: watchResponse.data.resourceId,
        resourceUri: watchResponse.data.resourceUri,
        verificationToken,
        driveId: triggerRegistration.params.driveId,
        includeRemoved: triggerRegistration.params.includeRemoved,
      },
    };
  },

  async getTriggerRegistrations(db, triggerId, event) {
    if (event.type !== "drive_change") return [];

    const registrations = await db
      .select()
      .from(triggerRegistrations)
      .where(
        and(
          eq(triggerRegistrations.providerId, "google"),
          eq(triggerRegistrations.triggerId, triggerId),
        ),
      );

    return registrations
      .filter((reg) => {
        const metadata = reg.subscriptionMetadata;
        return metadata?.channelId === event.channelId;
      })
      .map((reg) => ({
        ...reg,
        expiresAt: reg.expiresAt.toISOString(),
        createdAt: reg.createdAt.toISOString(),
        updatedAt: reg.updatedAt.toISOString(),
      }));
  },

  async createEvents(event, triggerRegistration) {
    if (event.type !== "drive_change") return [];

    return [
      {
        event: {
          type: "drive_file_changed",
          channelId: event.channelId,
          resourceId: event.resourceId,
          resourceState: event.resourceState,
          triggerRegistrationId: triggerRegistration.id,
        },
        partitionKey: triggerRegistration.agentId,
      },
    ];
  },

  eventSatisfies(event) {
    return event.type === "drive_change";
  },
};

// Calendar events change trigger
export const calendarEventsChangeTrigger: Trigger<GoogleWebhookEvent> = {
  id: "calendar.events.change",
  description:
    "Triggered when calendar events are created, modified, or deleted",
  requiredScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  paramsSchema: Type.Object({
    calendarId: Type.String({ default: "primary" }),
    timeMin: Type.Optional(Type.String()),
    timeMax: Type.Optional(Type.String()),
  }),

  async registerSubscription(db, connectionMetadata, triggerRegistration) {
    const token = await db.query.tokens.findFirst({
      where: eq(tokens.connectionId, triggerRegistration.connectionId!),
    });

    if (!token) {
      throw new Error("No token found for connection");
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(token.tokenPayload);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const channelId = randomUUID();
    const verificationToken = randomUUID();
    const calendarId = triggerRegistration.params.calendarId || "primary";

    const watchResponse = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: `${process.env.WEBHOOK_BASE_URL}/webhooks/google`,
        token: verificationToken,
        expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 7 days
      },
    });

    const expiresAt = new Date(parseInt(watchResponse.data.expiration!));

    return {
      expiresAt,
      subscriptionMetadata: {
        channelId: watchResponse.data.id,
        resourceId: watchResponse.data.resourceId,
        resourceUri: watchResponse.data.resourceUri,
        verificationToken,
        calendarId,
        timeMin: triggerRegistration.params.timeMin,
        timeMax: triggerRegistration.params.timeMax,
      },
    };
  },

  async getTriggerRegistrations(db, triggerId, event) {
    if (event.type !== "calendar_change") return [];

    const registrations = await db
      .select()
      .from(triggerRegistrations)
      .where(
        and(
          eq(triggerRegistrations.providerId, "google"),
          eq(triggerRegistrations.triggerId, triggerId),
        ),
      );

    return registrations
      .filter((reg) => {
        const metadata = reg.subscriptionMetadata;
        return metadata?.channelId === event.channelId;
      })
      .map((reg) => ({
        ...reg,
        expiresAt: reg.expiresAt.toISOString(),
        createdAt: reg.createdAt.toISOString(),
        updatedAt: reg.updatedAt.toISOString(),
      }));
  },

  async createEvents(event, triggerRegistration) {
    if (event.type !== "calendar_change") return [];

    return [
      {
        event: {
          type: "calendar_event_changed",
          channelId: event.channelId,
          resourceId: event.resourceId,
          resourceState: event.resourceState,
          triggerRegistrationId: triggerRegistration.id,
        },
        partitionKey: triggerRegistration.agentId,
      },
    ];
  },

  eventSatisfies(event) {
    return event.type === "calendar_change";
  },
};
