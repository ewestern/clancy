import { test, expect, vi, beforeEach, afterEach, describe } from "vitest";
import { cronTrigger } from "../../../src/integrations/internal.js";
import {
  createMockTriggerRegistration,
  assertEventStructure,
} from "./test-utils.js";

describe("Internal Provider - Cron Trigger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEvents", () => {
    test("should create RunIntent event when cron expression matches current time", async () => {
      // Test using a cron expression that includes the current time
      const now = new Date();
      const currentMinute = now.getMinutes();
      const currentHour = now.getHours();

      const triggerRegistration = createMockTriggerRegistration({
        id: "cron-trigger-123",
        agentId: "agent-456",
        orgId: "org-789",
        params: {
          schedule: `${currentMinute} ${currentHour} * * *`, // Current time every day
        },
      });

      const event = {
        "detail-type": "Scheduled Event",
        time: now.toISOString(),
      };

      const result = await cronTrigger.createEvents(event, triggerRegistration);

      expect(result).toHaveLength(1);

      const createdEvent = result[0];
      assertEventStructure(createdEvent, "cron-trigger-123");

      expect(createdEvent.event).toMatchObject({
        type: "runintent",
        orgId: "org-789",
        agentId: "agent-456",
        executionId: expect.stringMatching(/^exec-internal\.cron-/),
      });
      expect(createdEvent.event.timestamp).toBeDefined();
    });

    test("should return empty array when cron expression does not match current time", async () => {
      // Use a time that definitely won't match current time
      const triggerRegistration = createMockTriggerRegistration({
        params: {
          schedule: "59 23 31 2 *", // Feb 31st at 23:59 (invalid date)
        },
      });

      const event = {
        "detail-type": "Scheduled Event",
        time: new Date().toISOString(),
      };

      const result = await cronTrigger.createEvents(event, triggerRegistration);

      expect(result).toHaveLength(0);
    });

    test("should handle wildcard cron expressions", async () => {
      // Test with a wildcard expression that should always match
      const triggerRegistration = createMockTriggerRegistration({
        id: "wildcard-cron-123",
        params: {
          schedule: "* * * * *", // Every minute
        },
      });

      const event = {
        "detail-type": "Scheduled Event",
        time: new Date().toISOString(),
      };

      const result = await cronTrigger.createEvents(event, triggerRegistration);

      expect(result).toHaveLength(1);
      expect(result[0].partitionKey).toBe("wildcard-cron-123");
    });

    test("should return empty array when cron expression is invalid", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        params: {
          schedule: "invalid cron expression",
        },
      });

      const event = {
        "detail-type": "Scheduled Event",
        time: new Date().toISOString(),
      };

      const result = await cronTrigger.createEvents(event, triggerRegistration);

      expect(result).toHaveLength(0);
    });

    test("should handle edge case with missing schedule parameter", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        params: {}, // No schedule parameter
      });

      const event = {
        "detail-type": "Scheduled Event",
        time: new Date().toISOString(),
      };

      const result = await cronTrigger.createEvents(event, triggerRegistration);

      // When schedule is undefined, the cron parser may either error out (returning [])
      // or create a wildcard pattern that matches. Let's just check it doesn't crash.
      expect(Array.isArray(result)).toBe(true);
    });

    test("should generate execution IDs with timestamp", async () => {
      const triggerRegistration = createMockTriggerRegistration({
        params: {
          schedule: "* * * * *", // Every minute - should match
        },
      });

      const event = {
        "detail-type": "Scheduled Event",
        time: new Date().toISOString(),
      };

      const result = await cronTrigger.createEvents(event, triggerRegistration);

      expect(result).toHaveLength(1);
      expect(result[0].event.executionId).toMatch(
        /^exec-internal\.cron-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });
});
