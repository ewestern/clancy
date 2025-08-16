import { Type } from "@sinclair/typebox";
import { FastifySchema } from "fastify";
import {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../../types/fastify.js";
import { Webhook, Trigger } from "../../providers/types.js";
import { Database } from "../../plugins/database.js";
import { triggerRegistrations } from "../../database/schema.js";
import { eq, and } from "drizzle-orm";

// Google webhook event schemas
export const GoogleWebhookSchema = {
  headers: Type.Any(),
  body: Type.Any(),
};

export interface GoogleWebhookEvent {
  type: "drive_change" | "calendar_change" | "gmail_message";
  channelId?: string;
  resourceId?: string;
  resourceUri?: string;
  resourceState?: string;
  messageNumber?: string;
  expiration?: string;
  // Gmail-specific
  pubsubMessage?: {
    data: string;
    messageId: string;
    publishTime: string;
  };
}

export class GoogleWebhook implements Webhook<typeof GoogleWebhookSchema, any> {
  eventSchema = GoogleWebhookSchema;
  triggers: Trigger<any>[] = [];

  constructor(triggers: Trigger<any>[]) {
    this.triggers = triggers;
  }

  async validateRequest(
    request: FastifyRequestTypeBox<typeof GoogleWebhookSchema>,
  ): Promise<boolean> {
    const headers = request.headers;

    // Check if this is a Gmail Pub/Sub message
    if (
      headers.authorization &&
      headers["content-type"]?.includes("application/json")
    ) {
      // TODO: Verify Google-signed JWT token for Gmail Pub/Sub
      // For now, basic validation
      return true;
    }

    // Check if this is a Drive/Calendar webhook
    if (headers["x-goog-channel-id"] && headers["x-goog-resource-id"]) {
      // Validate against stored subscription metadata
      //return await this.validateChannelSubscription(
      //  headers["x-goog-channel-id"],
      //  headers["x-goog-resource-id"],
      //  headers["x-goog-channel-token"]
      //);
    }

    return false;
  }

  private async validateChannelSubscription(
    channelId: string,
    resourceId: string,
    token?: string,
  ): Promise<boolean> {
    // This would need access to the database to verify the subscription
    // For now, return true - we'll implement proper validation in the route handler
    return true;
  }

  async replyHook(
    request: FastifyRequestTypeBox<typeof GoogleWebhookSchema>,
    reply: FastifyReplyTypeBox<typeof GoogleWebhookSchema>,
  ): Promise<void> {
    // Google expects a 200 response for successful webhook processing
    reply.status(200).send();
  }

  //parseEvent(request: FastifyRequestTypeBox<typeof GoogleWebhookSchema>): GoogleWebhookEvent {
  //  const headers = request.headers;
  //  const body = request.body as any;
  //
  //  // Gmail Pub/Sub message
  //  if (headers.authorization && body?.message) {
  //    return {
  //      type: "gmail_message",
  //      pubsubMessage: {
  //        data: body.message.data,
  //        messageId: body.message.messageId,
  //        publishTime: body.message.publishTime,
  //      },
  //    };
  //  }
  //
  //  // Drive/Calendar webhook
  //  const resourceState = headers["x-goog-resource-state"];
  //  const type = resourceState?.includes("calendar") ? "calendar_change" : "drive_change";
  //
  //  return {
  //    type,
  //    channelId: headers["x-goog-channel-id"],
  //    resourceId: headers["x-goog-resource-id"],
  //    resourceUri: headers["x-goog-resource-uri"],
  //    resourceState: headers["x-goog-resource-state"],
  //    messageNumber: headers["x-goog-message-number"],
  //    expiration: headers["x-goog-expiration"],
  //  };
  //}
}

// Helper function to find trigger registrations by channel ID
export async function findRegistrationsByChannelId(
  db: Database,
  channelId: string,
  token?: string,
): Promise<(typeof triggerRegistrations.$inferSelect)[]> {
  const registrations = await db
    .select()
    .from(triggerRegistrations)
    .where(
      and(
        eq(triggerRegistrations.providerId, "google"),
        // We'll query the subscription metadata to find matching channel IDs
        // This is a simplified version - in practice we'd need to use JSON operators
      ),
    );

  // Filter by subscription metadata
  return registrations.filter((reg) => {
    const metadata = reg.subscriptionMetadata as any;
    return (
      metadata?.channelId === channelId &&
      (!token || metadata?.verificationToken === token)
    );
  });
}
