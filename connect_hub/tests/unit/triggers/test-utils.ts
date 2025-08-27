import { TriggerRegistration } from "../../../src/models/triggers.js";
import { expect, vi } from "vitest";

/**
 * Utility functions for trigger testing
 */

export function createMockTriggerRegistration(
  overrides: Partial<TriggerRegistration> = {},
): TriggerRegistration {
  return {
    id: "test-trigger-reg-123",
    orgId: "test-org-456",
    agentId: "test-agent-789",
    providerId: "test-provider",
    triggerId: "test-trigger",
    params: {},
    expiresAt: new Date("2025-12-31T23:59:59Z").toISOString(),
    createdAt: new Date("2024-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2024-01-01T00:00:00Z").toISOString(),
    connection: {
      id: "test-connection-202",
      orgId: "test-org-456",
      userId: "test-user-101",
      providerId: "test-provider",
      externalAccountMetadata: {},
      status: "active" as const,
    },
    ...overrides,
  };
}

/**
 * Assert that an event has the required structure
 */
export function assertEventStructure(
  event: { event: Record<string, unknown>; partitionKey: string },
  expectedPartitionKey: string,
) {
  expect(event).toHaveProperty("event");
  expect(event).toHaveProperty("partitionKey", expectedPartitionKey);
  expect(typeof event.event).toBe("object");
  expect(typeof event.partitionKey).toBe("string");
}

/**
 * Mock date for consistent testing
 */
export function mockCurrentDate(date: string = "2024-01-15T10:30:00Z") {
  const mockDate = new Date(date);
  const OriginalDate = Date;

  const DateMock = function DateMock(...args: any[]) {
    if (args.length === 0) {
      return mockDate;
    }
    return new OriginalDate(...args);
  } as any;

  // Copy all static methods from original Date
  Object.setPrototypeOf(DateMock, OriginalDate);
  Object.getOwnPropertyNames(OriginalDate).forEach((name) => {
    if (name !== "length" && name !== "name" && name !== "prototype") {
      DateMock[name] = OriginalDate[name as keyof typeof OriginalDate];
    }
  });

  // Override specific methods if needed
  DateMock.now = () => mockDate.getTime();

  vi.stubGlobal("Date", DateMock);

  return mockDate;
}

/**
 * Restore original Date implementation
 */
export function restoreDateMock() {
  vi.unstubAllGlobals();
}
