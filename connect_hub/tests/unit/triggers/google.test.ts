import { test, expect, vi, beforeEach, describe } from "vitest";
import {
  gmailMessageReceivedTrigger,
  driveFileChangeTrigger,
  calendarEventsChangeTrigger,
} from "../../../src/integrations/google/triggers.js";
import {
  createMockTriggerRegistration,
  assertEventStructure,
} from "./test-utils.js";
import type { GoogleWebhookEvent } from "../../../src/integrations/google.js";
import { EventType } from "@ewestern/events";

describe("Google Provider - Triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Gmail Message Received Trigger", () => {
    describe("createEvents", () => {
      test("should create event for valid Gmail message", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "gmail-trigger-123",
          providerId: "google",
          agentId: "gmail-agent-456",
        });

        const gmailEvent: GoogleWebhookEvent = {
          message: {
            data: Buffer.from(
              JSON.stringify({
                historyId: "hist987654321",
                emailAddress: "user@example.com",
              }),
            ).toString("base64"),
            messageId: "pubsub-msg-123",
          },
          subscription: "test-subscription",
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          gmailEvent,
          {},
          triggerRegistration,
        );

        expect(result).toHaveLength(1);

        const createdEvent = result[0];
        assertEventStructure(createdEvent, "gmail-trigger-123");

        expect(createdEvent.event).toMatchObject({
          type: EventType.RunIntent,
          details: {
            historyId: "hist987654321",
            emailAddress: "user@example.com",
          },
        });
      });

      test("should return empty array for non-Gmail message event", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const nonGmailEvent: GoogleWebhookEvent = {
          message: {
            data: "invalid-data",
            messageId: "test-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          nonGmailEvent,
          {},
          triggerRegistration,
        );

        expect(result).toHaveLength(0);
      });

      test("should return empty array when pubsubMessage is missing", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const incompleteEvent: GoogleWebhookEvent = {
          message: {
            data: "incomplete-data",
            messageId: "test-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          incompleteEvent,
          {},
          triggerRegistration,
        );

        expect(result).toHaveLength(0);
      });

      test("should handle complex Gmail message data", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "gmail-trigger-complex",
          providerId: "google",
          agentId: "gmail-agent-complex",
        });

        const complexMessageData = {
          messageId: "msg123456789",
          historyId: "hist987654321",
          emailAddress: "user@example.com",
          labels: ["INBOX", "IMPORTANT"],
          snippet: "This is a preview of the email",
          threadId: "thread789012345",
        };

        const gmailEvent: GoogleWebhookEvent = {
          message: {
            data: Buffer.from(JSON.stringify(complexMessageData)).toString(
              "base64",
            ),
            messageId: "pubsub-msg-456",
          },
          subscription: "test-subscription",
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          gmailEvent,
          {},
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: EventType.RunIntent,
          details: {
            historyId: "hist987654321",
            emailAddress: "user@example.com",
          },
        });
      });
    });
  });

  describe("Drive File Change Trigger", () => {
    describe("createEvents", () => {
      test("should create event for Drive file change", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "drive-trigger-123",
          providerId: "google",
          agentId: "drive-agent-456",
        });

        const driveEvent: GoogleWebhookEvent = {
          message: {
            data: "drive-webhook-data",
            messageId: "drive-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await driveFileChangeTrigger.createEvents(
          driveEvent,
          {
            "x-goog-channel-id": "channel123456",
            "x-goog-resource-id": "resource789012",
            "x-goog-resource-uri":
              "https://www.googleapis.com/drive/v3/files/file123",
          },
          triggerRegistration,
        );

        expect(result).toHaveLength(1);

        const createdEvent = result[0];
        assertEventStructure(createdEvent, "drive-agent-456");

        expect(createdEvent.event).toMatchObject({
          type: EventType.RunIntent,
          details: {
            resourceId: "resource789012",
            resourceUri: "https://www.googleapis.com/drive/v3/files/file123",
          },
        });
      });

      test("should create event for file creation", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "drive-trigger-create",
          providerId: "google",
          agentId: "drive-agent-create",
        });

        const driveEvent: GoogleWebhookEvent = {
          message: {
            data: "drive-webhook-data-2",
            messageId: "drive-message-id-2",
          },
          subscription: "test-subscription",
        };

        const result = await driveFileChangeTrigger.createEvents(
          driveEvent,
          {
            "x-goog-channel-id": "channel789",
            "x-goog-resource-id": "resource456",
            "x-goog-resource-uri":
              "https://www.googleapis.com/drive/v3/files/file456",
          },
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: EventType.RunIntent,
          details: {
            resourceId: "resource456",
            resourceUri: "https://www.googleapis.com/drive/v3/files/file456",
          },
        });
      });

      test("should return empty array for non-Drive change event", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const nonDriveEvent: GoogleWebhookEvent = {
          message: {
            data: "non-drive-data",
            messageId: "non-drive-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await driveFileChangeTrigger.createEvents(
          nonDriveEvent,
          {},
          triggerRegistration,
        );

        expect(result).toHaveLength(0);
      });
    });
  });

  describe("Calendar Events Change Trigger", () => {
    describe("createEvents", () => {
      test("should create event for calendar change", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "calendar-trigger-123",
          providerId: "google",
          agentId: "calendar-agent-456",
        });

        const calendarEvent: GoogleWebhookEvent = {
          message: {
            data: "calendar-webhook-data",
            messageId: "calendar-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          calendarEvent,
          {
            "x-goog-channel-id": "calendar-channel123",
            "x-goog-resource-id": "calendar-resource456",
            "x-goog-resource-state": "exists",
          },
          triggerRegistration,
        );

        expect(result).toHaveLength(1);

        const createdEvent = result[0];
        assertEventStructure(createdEvent, "calendar-agent-456");

        expect(createdEvent.event).toMatchObject({
          type: EventType.RunIntent,
          details: {
            channelId: "calendar-channel123",
            resourceId: "calendar-resource456",
            resourceState: "exists",
          },
        });
      });

      test("should create event for event deletion", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "calendar-trigger-delete",
          providerId: "google",
          agentId: "calendar-agent-delete",
        });

        const calendarEvent: GoogleWebhookEvent = {
          message: {
            data: "calendar-delete-data",
            messageId: "calendar-delete-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          calendarEvent,
          {
            "x-goog-channel-id": "calendar-channel789",
            "x-goog-resource-id": "calendar-resource012",
            "x-goog-resource-state": "not_exists",
          },
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: EventType.RunIntent,
          details: {
            channelId: "calendar-channel789",
            resourceId: "calendar-resource012",
            resourceState: "not_exists",
          },
        });
      });

      test("should return empty array for non-calendar change event", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const nonCalendarEvent: GoogleWebhookEvent = {
          message: {
            data: "non-calendar-data",
            messageId: "non-calendar-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          nonCalendarEvent,
          {},
          triggerRegistration,
        );

        expect(result).toHaveLength(0);
      });

      test("should handle calendar sync events", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "calendar-trigger-sync",
          providerId: "google",
          agentId: "calendar-agent-sync",
        });

        const calendarEvent: GoogleWebhookEvent = {
          message: {
            data: "calendar-sync-data",
            messageId: "calendar-sync-message-id",
          },
          subscription: "test-subscription",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          calendarEvent,
          {
            "x-goog-channel-id": "calendar-sync-123",
            "x-goog-resource-id": "calendar-sync-456",
            "x-goog-resource-state": "sync",
          },
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: EventType.RunIntent,
          details: {
            channelId: "calendar-sync-123",
            resourceId: "calendar-sync-456",
            resourceState: "sync",
          },
        });
      });
    });
  });
});
