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
import type { GoogleWebhookEvent } from "../../../src/integrations/google/webhooks.js";

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
          type: "gmail_message",
          pubsubMessage: {
            data: Buffer.from(
              JSON.stringify({
                messageId: "msg123456789",
                historyId: "hist987654321",
                emailAddress: "user@example.com",
              }),
            ).toString("base64"),
            messageId: "pubsub-msg-123",
            publishTime: "2024-01-15T10:30:00Z",
          },
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          gmailEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(1);

        const createdEvent = result[0];
        assertEventStructure(createdEvent, "gmail-agent-456");

        expect(createdEvent.event).toMatchObject({
          type: "gmail_message_received",
          messageId: "msg123456789",
          historyId: "hist987654321",
          emailAddress: "user@example.com",
          triggerRegistrationId: "gmail-trigger-123",
        });
      });

      test("should return empty array for non-Gmail message event", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const nonGmailEvent: GoogleWebhookEvent = {
          type: "drive_change",
          channelId: "channel123",
          resourceId: "resource456",
          resourceState: "sync",
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          nonGmailEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(0);
      });

      test("should return empty array when pubsubMessage is missing", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const incompleteEvent: GoogleWebhookEvent = {
          type: "gmail_message",
          // Missing pubsubMessage
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          incompleteEvent,
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
          type: "gmail_message",
          pubsubMessage: {
            data: Buffer.from(JSON.stringify(complexMessageData)).toString(
              "base64",
            ),
            messageId: "pubsub-msg-456",
            publishTime: "2024-01-15T10:30:00Z",
          },
        };

        const result = await gmailMessageReceivedTrigger.createEvents(
          gmailEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: "gmail_message_received",
          messageId: "msg123456789",
          historyId: "hist987654321",
          emailAddress: "user@example.com",
          triggerRegistrationId: "gmail-trigger-complex",
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
          type: "drive_change",
          channelId: "channel123456",
          resourceId: "resource789012",
          resourceState: "update",
          resourceUri: "https://www.googleapis.com/drive/v3/files/file123",
        };

        const result = await driveFileChangeTrigger.createEvents(
          driveEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(1);

        const createdEvent = result[0];
        assertEventStructure(createdEvent, "drive-agent-456");

        expect(createdEvent.event).toMatchObject({
          type: "drive_file_changed",
          channelId: "channel123456",
          resourceId: "resource789012",
          resourceState: "update",
          triggerRegistrationId: "drive-trigger-123",
        });
      });

      test("should create event for file creation", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "drive-trigger-create",
          providerId: "google",
          agentId: "drive-agent-create",
        });

        const driveEvent: GoogleWebhookEvent = {
          type: "drive_change",
          channelId: "channel789",
          resourceId: "resource456",
          resourceState: "sync",
        };

        const result = await driveFileChangeTrigger.createEvents(
          driveEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: "drive_file_changed",
          channelId: "channel789",
          resourceId: "resource456",
          resourceState: "sync",
          triggerRegistrationId: "drive-trigger-create",
        });
      });

      test("should return empty array for non-Drive change event", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const nonDriveEvent: GoogleWebhookEvent = {
          type: "calendar_change",
          channelId: "calendar123",
          resourceId: "calendar456",
          resourceState: "sync",
        };

        const result = await driveFileChangeTrigger.createEvents(
          nonDriveEvent,
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
          type: "calendar_change",
          channelId: "calendar-channel123",
          resourceId: "calendar-resource456",
          resourceState: "exists",
          resourceUri:
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          calendarEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(1);

        const createdEvent = result[0];
        assertEventStructure(createdEvent, "calendar-agent-456");

        expect(createdEvent.event).toMatchObject({
          type: "calendar_event_changed",
          channelId: "calendar-channel123",
          resourceId: "calendar-resource456",
          resourceState: "exists",
          triggerRegistrationId: "calendar-trigger-123",
        });
      });

      test("should create event for event deletion", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          id: "calendar-trigger-delete",
          providerId: "google",
          agentId: "calendar-agent-delete",
        });

        const calendarEvent: GoogleWebhookEvent = {
          type: "calendar_change",
          channelId: "calendar-channel789",
          resourceId: "calendar-resource012",
          resourceState: "not_exists",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          calendarEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: "calendar_event_changed",
          channelId: "calendar-channel789",
          resourceId: "calendar-resource012",
          resourceState: "not_exists",
          triggerRegistrationId: "calendar-trigger-delete",
        });
      });

      test("should return empty array for non-calendar change event", async () => {
        const triggerRegistration = createMockTriggerRegistration({
          providerId: "google",
        });

        const nonCalendarEvent: GoogleWebhookEvent = {
          type: "drive_change",
          channelId: "drive123",
          resourceId: "drive456",
          resourceState: "sync",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          nonCalendarEvent,
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
          type: "calendar_change",
          channelId: "calendar-sync-123",
          resourceId: "calendar-sync-456",
          resourceState: "sync",
          resourceUri:
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        };

        const result = await calendarEventsChangeTrigger.createEvents(
          calendarEvent,
          triggerRegistration,
        );

        expect(result).toHaveLength(1);
        expect(result[0].event).toMatchObject({
          type: "calendar_event_changed",
          channelId: "calendar-sync-123",
          resourceId: "calendar-sync-456",
          resourceState: "sync",
          triggerRegistrationId: "calendar-trigger-sync",
        });
      });
    });
  });
});
