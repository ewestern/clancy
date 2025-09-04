import { Type } from "@sinclair/typebox";
import { google } from "googleapis";
import { triggerRegistrations, tokens, connections } from "../../database/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { Trigger } from "../../providers/types.js";
import { GoogleWebhookEvent } from "../google.js";
import { randomUUID } from "crypto";
import { EventType } from "@ewestern/events";

// Gmail message received trigger
export const gmailMessageReceivedTrigger: Trigger<GoogleWebhookEvent> = {
  id: "gmail.message.received",
  description: "Triggered when a new Gmail message is received",
  displayName: "Gmail Message Received",
  requiredScopes: ["https://www.googleapis.com/auth/gmail.metadata"],
  paramsSchema: Type.Object({
    labelIds: Type.Optional(Type.Array(Type.String())),
  }),
  eventDetailsSchema: Type.Object(
    {
      historyId: Type.String({ description: "The ID of the history" }),
      emailAddress: Type.String({
        description: "The email address of the message",
      }),
    },
    {
      description:
        "Agents must use the gmail.history.list capability with the given history ID and email address to retrieve the message details.",
    },
  ),
  renderTriggerDefinition: (trigger, triggerRegistration) => {
    if (triggerRegistration.params.labelIds) {
      return `Triggered when a new Gmail message is received for the following labels: ${triggerRegistration.params.labelIds?.join(", ")}`;
    }
    return `Triggered when a new Gmail message is received`;
  },

  async registerSubscription(
    db,
    connectionMetadata,
    triggerRegistration,
    oauthContext,
  ) {
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
    const {
      data: { emailAddress },
    } = await gmail.users.getProfile({
      userId: "me",
    });
    if (!emailAddress) {
      throw new Error("No email address found for user");
    }
    const {
      data: { historyId, expiration },
    } = await gmail.users.watch({
      userId: emailAddress,
      requestBody: {
        topicName: process.env.GOOGLE_PUBSUB_TOPIC_NAME,
        labelIds: triggerRegistration.params.labelIds,
        labelFilterAction: "include",
      },
    });

    const expiresAt = new Date(parseInt(expiration!));

    return {
      expiresAt,
      subscriptionMetadata: {
        emailAddress,
        historyId,
        expiration,
        verificationToken,
        topicName: process.env.GOOGLE_PUBSUB_TOPIC_NAME,
        labelIds: triggerRegistration.params.labelIds,
        query: triggerRegistration.params.query,
      },
    };
  },

  async getTriggerRegistrations(db, triggerId, event, headers) {
    // Find registrations for Gmail triggers
    //base64 decode the data
    console.log("event", event);
    const { data } = event.message;
    try {
      const { emailAddress, historyId } = JSON.parse(
        Buffer.from(data, "base64").toString(),
      ) as { emailAddress: string; historyId: string };

      const registrations = await db.query.triggerRegistrations.findMany({
        where: and(
          eq(triggerRegistrations.providerId, "google"),
          eq(triggerRegistrations.triggerId, triggerId),
          sql<string>`${triggerRegistrations.subscriptionMetadata}->>'emailAddress' = ${emailAddress}`,
        ),
        with: {
          connection: true,
        },
      });

      return registrations.map((registration) => ({
        ...registration,
        connection: registration.connection || undefined,
        expiresAt: registration.expiresAt?.toISOString(),
        createdAt: registration.createdAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error("Error getting trigger registrations", error);
      return [];
    }
  },

  async createEvents(event, headers, triggerRegistration) {
    if (!event.message.data) return [];

    try {
      const { historyId, emailAddress } = JSON.parse(
        Buffer.from(event.message.data, "base64").toString(),
      ) as { historyId: string; emailAddress: string };

      return [
        {
          event: {
            type: EventType.RunIntent,
            timestamp: new Date().toISOString(),
            orgId: triggerRegistration.orgId,
            agentId: triggerRegistration.agentId,
            executionId: `exec-google.gmail-message-${new Date().getTime()}`,
            userId: triggerRegistration.connection?.userId!,
            details: {
              historyId,
              emailAddress,
            },
          },
          partitionKey: triggerRegistration.id!,
        },
      ];
    } catch (error) {
      // Invalid JSON data, return empty array
      return [];
    }
  },

  eventSatisfies(event, headers) {
    const { emailAddress } = JSON.parse(
      Buffer.from(event.message.data, "base64").toString(),
    );
    if (!emailAddress) return false;
    return true;
  },
};
export const DriveResourceState = Type.Union([
  Type.Literal("sync"),
  Type.Literal("add"),
  Type.Literal("remove"),
  Type.Literal("update"),
  Type.Literal("trash"),
  Type.Literal("untrash"),
  Type.Literal("change"),
]);

// Drive file change trigger
export const driveFileChangeTrigger: Trigger<GoogleWebhookEvent> = {
  id: "drive.files.change",
  description: "Triggered when Drive files are created, modified, or deleted",
  displayName: "Drive File Change",
  requiredScopes: ["https://www.googleapis.com/auth/drive.metadata.readonly"],
  paramsSchema: Type.Object({
    fileId: Type.String(),
  }),

  eventDetailsSchema: Type.Object(
    {
      resourceId: Type.String({ description: "The ID of the resource" }),
      resourceUri: Type.String({ description: "The URI of the resource" }),
      resourceState: DriveResourceState,
    },
    {
      description:
        "Agents must use capabilities to retrieve the resource details. For example, if an event includes a resourceUri of a file, the agent will need drives.files.get.all to retrieve the resource.",
    },
  ),
  resolveTriggerParams: async (db, orgId, userId) => {
    const connectionWithToken = await db.query.connections.findFirst({
      where: and(
        eq(connections.orgId, orgId),
        eq(connections.userId, userId),
        eq(connections.providerId, "google"),
      ),
      with: {
        token: true,
      },
    });

    if (!connectionWithToken) {
      throw new Error("No token found for connection");
    }
    const { token, ...connection } = connectionWithToken;

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(token.tokenPayload);

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const drivesResponse = await drive.files.list({
      q: ""
    });
    const files = drivesResponse.data.files || [];

    return {
      "fileId": files.map((file) => {
        return {
          id: file.id,
          name: file.name,
        };
      }),
    };
  },

  renderTriggerDefinition: (trigger, triggerRegistration) => {
    const resourceUri = triggerRegistration.subscriptionMetadata.resourceUri;
    return `Triggered when Drive files are created, modified, or deleted for the following resource: ${resourceUri}`;
  },

  async registerSubscription(db, connectionMetadata, triggerRegistration) {
    const { connectionId, params } = triggerRegistration;
    const oauthToken = await db.query.tokens.findFirst({
      where: eq(tokens.connectionId, connectionId!),
    });

    if (!oauthToken) {
      throw new Error("No token found for connection");
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials(oauthToken.tokenPayload);

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const {
      data: { id, resourceId, resourceUri, expiration, token },
    } = await drive.changes.watch({
      driveId: params.driveId,
      includeRemoved: params.includeRemoved,
    });

    const expiresAt = new Date(parseInt(expiration!));

    return {
      expiresAt,
      subscriptionMetadata: {
        channelId: id,
        resourceId: resourceId,
        resourceUri: resourceUri,
        verificationToken: token,
        driveId: triggerRegistration.params.driveId,
        includeRemoved: triggerRegistration.params.includeRemoved,
      },
    };
  },

  async getTriggerRegistrations(db, triggerId, event, headers) {
    const channelId = headers["x-goog-channel-id"];
    const registrations = await db.query.triggerRegistrations.findMany({
      where: and(
        eq(triggerRegistrations.providerId, "google"),
        eq(triggerRegistrations.triggerId, triggerId),
        sql<string>`${triggerRegistrations.subscriptionMetadata}->>'channelId' = ${channelId}`,
      ),
    });
    return registrations.map((registration) => ({
      ...registration,
      expiresAt: registration.expiresAt?.toISOString(),
      createdAt: registration.createdAt.toISOString(),
      updatedAt: registration.updatedAt.toISOString(),
    }));
  },

  async createEvents(event, headers, triggerRegistration) {
    const channelId = headers["x-goog-channel-id"];
    const resourceId = headers["x-goog-resource-id"];
    const resourceUri = headers["x-goog-resource-uri"];

    // Only create events if we have the required Drive headers
    if (!channelId || !resourceId) return [];

    return [
      {
        event: {
          type: EventType.RunIntent,
          timestamp: new Date().toISOString(),
          orgId: triggerRegistration.orgId,
          agentId: triggerRegistration.agentId,
          executionId: `exec-google.drive-file-change-${new Date().getTime()}`,
          userId: triggerRegistration.connection?.userId!,
          details: {
            resourceId,
            resourceUri,
          },
        },
        partitionKey: triggerRegistration.agentId,
      },
    ];
  },

  eventSatisfies(event, headers) {
    const channelId = headers["x-goog-channel-id"];
    if (!channelId) return false;
    if (event.kind !== "drive#changes") return false;
    return true;
  },
};

export const CalendarEventTypes = Type.Union([
  Type.Literal("birthday"),
  Type.Literal("default"),
  Type.Literal("focusTime"),
  Type.Literal("fromGmail"),
  Type.Literal("outOfOffice"),
  Type.Literal("workingLocation"),
]);
// Calendar events change trigger
export const calendarEventsChangeTrigger: Trigger<GoogleWebhookEvent> = {
  id: "calendar.events.change",
  description:
    "Triggered when calendar events are created, modified, or deleted",
  displayName: "Calendar Events Change",
  requiredScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  paramsSchema: Type.Object({
    calendarId: Type.String({ default: "primary" }),
    eventTypes: Type.Optional(Type.Array(CalendarEventTypes)),
  }),
  eventDetailsSchema: Type.Object(
    {
      channelId: Type.String({ description: "The ID of the channel" }),
      resourceId: Type.String({ description: "The ID of the resource" }),
      resourceState: Type.String({ description: "The state of the resource" }),
    },
    {
      description:
        "Agents must use capabilities to retrieve the resource details. For example, if an event includes a resourceUri of a file, the agent will need drives.files.get.all to retrieve the resource.",
    },
  ),

  renderTriggerDefinition: (trigger, triggerRegistration) => {
    const calendarId = triggerRegistration.params.calendarId || "primary";
    return `Triggered when calendar events change in calendar: ${calendarId}`;
  },

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

    const calendarId = triggerRegistration.params.calendarId || "primary";

    const watchResponse = await calendar.events.watch({
      calendarId,
      requestBody: {
        address: process.env.GOOGLE_PUBSUB_TOPIC_NAME,
      },
    });

    const expiresAt = new Date(parseInt(watchResponse.data.expiration!));

    return {
      expiresAt,
      subscriptionMetadata: {
        channelId: watchResponse.data.id,
        resourceId: watchResponse.data.resourceId,
        resourceUri: watchResponse.data.resourceUri,
        calendarId,
        timeMin: triggerRegistration.params.timeMin,
        timeMax: triggerRegistration.params.timeMax,
      },
    };
  },

  async getTriggerRegistrations(db, triggerId, event, headers) {
    const channelId = headers["x-goog-channel-id"];
    if (!channelId) return [];

    const registrations = await db.query.triggerRegistrations.findMany({
      where: and(
        eq(triggerRegistrations.providerId, "google"),
        eq(triggerRegistrations.triggerId, triggerId),
        sql<string>`${triggerRegistrations.subscriptionMetadata}->>'channelId' = ${channelId}`,
      ),
    });

    return registrations.map((reg) => ({
      ...reg,
      expiresAt: reg.expiresAt?.toISOString(),
      createdAt: reg.createdAt.toISOString(),
      updatedAt: reg.updatedAt.toISOString(),
    }));
  },

  async createEvents(event, headers, triggerRegistration) {
    const channelId = headers["x-goog-channel-id"];
    const resourceId = headers["x-goog-resource-id"];
    const resourceState = headers["x-goog-resource-state"];

    if (!channelId) return [];

    return [
      {
        event: {
          type: EventType.RunIntent,
          timestamp: new Date().toISOString(),
          orgId: triggerRegistration.orgId,
          agentId: triggerRegistration.agentId,
          executionId: `exec-google.calendar-events-${new Date().getTime()}`,
          userId: triggerRegistration.connection?.userId!,
          details: {
            channelId,
            resourceId,
            resourceState,
          },
        },
        partitionKey: triggerRegistration.agentId,
      },
    ];
  },

  eventSatisfies(event, headers) {
    // Calendar events are identified by the presence of specific headers
    // We'll check this in getTriggerRegistrations instead
    return true;
  },
};
