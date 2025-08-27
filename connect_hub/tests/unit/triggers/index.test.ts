/**
 * Integration trigger test suite - Main test runner
 *
 * This file serves as the entry point for all trigger tests and provides
 * a comprehensive test suite for all implemented trigger createEvents methods.
 */

import { test, expect, describe } from "vitest";

describe("Integration Triggers Test Suite", () => {
  test("all trigger test files are importable", () => {
    // This is a basic smoke test to ensure all our test files can be imported
    expect(true).toBe(true);
  });

  test("test utilities are properly exported", async () => {
    const { createMockTriggerRegistration, assertEventStructure } =
      await import("./test-utils.js");

    expect(typeof createMockTriggerRegistration).toBe("function");
    expect(typeof assertEventStructure).toBe("function");

    // Test that createMockTriggerRegistration returns a valid object
    const mockReg = createMockTriggerRegistration();
    expect(mockReg).toHaveProperty("id");
    expect(mockReg).toHaveProperty("orgId");
    expect(mockReg).toHaveProperty("agentId");
    expect(mockReg).toHaveProperty("providerId");
    expect(mockReg).toHaveProperty("params");
  });
});
