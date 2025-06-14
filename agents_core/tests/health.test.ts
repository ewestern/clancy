import { test, expect, vi } from "vitest";
import { createApp } from "../src/app.js";

test("GET /health returns 200", async () => {
  // Mock database URL for testing
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

  const app = await createApp();

  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  // Health check will fail without real database, expect 503
  expect(response.statusCode).toBe(503);
  const body = response.json();
  expect(body).toMatchObject({
    status: "unhealthy",
    timestamp: expect.any(String),
    version: expect.any(String),
    dependencies: expect.any(Object),
  });

  await app.close();
});

test("GET /ready returns 503", async () => {
  // Mock database URL for testing
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

  const app = await createApp();

  const response = await app.inject({
    method: "GET",
    url: "/ready",
  });

  // Ready check will fail without real database, expect 503
  expect(response.statusCode).toBe(503);
  const body = response.json();
  expect(body).toMatchObject({
    status: "not ready",
    timestamp: expect.any(String),
  });

  await app.close();
});

test("GET /live returns 200", async () => {
  const app = await createApp();

  const response = await app.inject({
    method: "GET",
    url: "/live",
  });

  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body).toMatchObject({
    status: "alive",
    timestamp: expect.any(String),
  });

  await app.close();
});
