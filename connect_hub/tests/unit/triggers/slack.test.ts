import { test, expect, vi, beforeEach, describe } from "vitest";
import { slackTriggers } from "../../../src/integrations/slack.js";
import {
  createMockTriggerRegistration,
  assertEventStructure,
} from "./test-utils.js";
import type { WebhookEvent } from "../../../src/integrations/slack.js";

describe("Slack Provider - Message Created Trigger", () => {
  const messageCreatedTrigger = slackTriggers.find(
    (t) => t.id === "message.created",
  )!;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEvents", () => {
    test("should create event for basic message", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        id: "slack-trigger-123",
        providerId: "slack",
      });

      const slackEvent: WebhookEvent = {
        token: "verification-token",
        team_id: "T123456",
        api_app_id: "A123456",
        type: "event_callback",
        event: {
          type: "message",
          channel: "C123456",
          user: "U123456",
          text: "Hello world!",
          ts: "1234567890.123456",
        } as any,
        authorizations: [
          {
            enterprise_id: "E123456",
            team_id: "T123456",
            user_id: "U123456",
          },
        ],
        event_context: "1-message-T123456-C123456",
        event_id: "Ev123456",
        event_time: 1234567890,
      };

      const result = await messageCreatedTrigger.createEvents(
        slackEvent,
        triggerRegistration,
      );

      expect(result).toHaveLength(1);

      const createdEvent = result[0];
      assertEventStructure(createdEvent, "slack-trigger-123");

      // The event should be the original Slack event
      expect(createdEvent.event).toEqual(slackEvent);
    });

    test("should create event for message with attachments", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        id: "slack-trigger-456",
        providerId: "slack",
      });

      const slackEvent: WebhookEvent = {
        token: "verification-token",
        team_id: "T123456",
        api_app_id: "A123456",
        type: "event_callback",
        event: {
          type: "message",
          channel: "C123456",
          user: "U123456",
          text: "Check out this file!",
          ts: "1234567890.123456",
          files: [
            {
              id: "F123456",
              name: "document.pdf",
              mimetype: "application/pdf",
              size: 12345,
            },
          ],
        } as any,
        authorizations: [
          {
            team_id: "T123456",
            user_id: "U123456",
          },
        ],
        event_context: "1-message-T123456-C123456",
        event_id: "Ev123456",
        event_time: 1234567890,
      };

      const result = await messageCreatedTrigger.createEvents(
        slackEvent,
        triggerRegistration,
      );

      expect(result).toHaveLength(1);
      expect(result[0].event).toEqual(slackEvent);
      expect(result[0].partitionKey).toBe("slack-trigger-456");
    });

    test("should create event for threaded message", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        id: "slack-trigger-789",
        providerId: "slack",
      });

      const slackEvent: WebhookEvent = {
        token: "verification-token",
        team_id: "T123456",
        api_app_id: "A123456",
        type: "event_callback",
        event: {
          type: "message",
          channel: "C123456",
          user: "U123456",
          text: "This is a reply",
          ts: "1234567890.123456",
          thread_ts: "1234567800.123456", // Reply to a thread
        } as any,
        authorizations: [
          {
            team_id: "T123456",
            user_id: "U123456",
          },
        ],
        event_context: "1-message-T123456-C123456",
        event_id: "Ev123456",
        event_time: 1234567890,
      };

      const result = await messageCreatedTrigger.createEvents(
        slackEvent,
        triggerRegistration,
      );

      expect(result).toHaveLength(1);
      expect(result[0].event).toEqual(slackEvent);
    });

    test("should create event for message with mentions", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        id: "slack-trigger-mention",
        providerId: "slack",
      });

      const slackEvent: WebhookEvent = {
        token: "verification-token",
        team_id: "T123456",
        api_app_id: "A123456",
        type: "event_callback",
        event: {
          type: "message",
          channel: "C123456",
          user: "U123456",
          text: "Hey <@U789012>, can you help with this?",
          ts: "1234567890.123456",
        } as any,
        authorizations: [
          {
            team_id: "T123456",
            user_id: "U123456",
          },
        ],
        event_context: "1-message-T123456-C123456",
        event_id: "Ev123456",
        event_time: 1234567890,
      };

      const result = await messageCreatedTrigger.createEvents(
        slackEvent,
        triggerRegistration,
      );

      expect(result).toHaveLength(1);
      expect(result[0].event).toEqual(slackEvent);
    });

    test("should create event for bot message", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        id: "slack-trigger-bot",
        providerId: "slack",
      });

      const slackEvent: WebhookEvent = {
        token: "verification-token",
        team_id: "T123456",
        api_app_id: "A123456",
        type: "event_callback",
        event: {
          type: "message",
          channel: "C123456",
          bot_id: "B123456",
          text: "Automated message from bot",
          ts: "1234567890.123456",
          username: "MyBot",
        } as any,
        authorizations: [
          {
            team_id: "T123456",
            user_id: "U123456",
          },
        ],
        event_context: "1-message-T123456-C123456",
        event_id: "Ev123456",
        event_time: 1234567890,
      };

      const result = await messageCreatedTrigger.createEvents(
        slackEvent,
        triggerRegistration,
      );

      expect(result).toHaveLength(1);
      expect(result[0].event).toEqual(slackEvent);
    });

    test("should preserve all event properties in created event", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        id: "slack-trigger-preserve",
        providerId: "slack",
      });

      const slackEvent: WebhookEvent = {
        token: "verification-token",
        team_id: "T123456",
        api_app_id: "A123456",
        type: "event_callback",
        event: {
          type: "message",
          channel: "C123456",
          user: "U123456",
          text: "Complex message",
          ts: "1234567890.123456",
          edited: {
            user: "U123456",
            ts: "1234567891.123456",
          },
          reactions: [
            {
              name: "thumbsup",
              count: 2,
              users: ["U111111", "U222222"],
            },
          ],
        } as any,
        authorizations: [
          {
            enterprise_id: "E123456",
            team_id: "T123456",
            user_id: "U123456",
          },
        ],
        event_context: "1-message-T123456-C123456",
        event_id: "Ev123456",
        event_time: 1234567890,
      };

      const result = await messageCreatedTrigger.createEvents(
        slackEvent,
        triggerRegistration,
      );

      expect(result).toHaveLength(1);

      // Verify the entire Slack event is preserved
      expect(result[0].event).toEqual(slackEvent);

      // Verify specific complex properties are preserved
      expect((result[0].event as any).event.edited).toEqual({
        user: "U123456",
        ts: "1234567891.123456",
      });
      expect((result[0].event as any).event.reactions).toEqual([
        {
          name: "thumbsup",
          count: 2,
          users: ["U111111", "U222222"],
        },
      ]);
    });

    test("should handle empty or minimal message event", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        id: "slack-trigger-minimal",
        providerId: "slack",
      });

      const slackEvent: WebhookEvent = {
        token: "verification-token",
        team_id: "T123456",
        api_app_id: "A123456",
        type: "event_callback",
        event: {
          type: "message",
          channel: "C123456",
          ts: "1234567890.123456",
        } as any,
        authorizations: [
          {
            team_id: "T123456",
          },
        ],
        event_context: "1-message-T123456-C123456",
        event_id: "Ev123456",
        event_time: 1234567890,
      };

      const result = await messageCreatedTrigger.createEvents(
        slackEvent,
        triggerRegistration,
      );

      expect(result).toHaveLength(1);
      expect(result[0].event).toEqual(slackEvent);
    });
  });
});
