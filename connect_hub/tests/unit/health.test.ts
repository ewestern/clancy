import { test, expect } from "vitest";
import { createApp } from "../../src/app.js";

test("GET /health returns 200", async () => {
  const app = await createApp();

  const response = await app.inject({
    method: "GET",
    url: "/health",
  });

  expect(response.statusCode).toBe(200);

  const body = response.json();
  expect(body).toMatchObject({
    status: expect.any(String),
    timestamp: expect.any(String),
    version: expect.any(String),
    uptime: expect.any(Number),
    dependencies: {
      database: expect.any(String),
      auth0: expect.any(String),
    },
  });
});

test("GET /ready returns 200", async () => {
  const app = await createApp();

  const response = await app.inject({
    method: "GET",
    url: "/ready",
  });

  expect(response.statusCode).toBe(200);
});

test("GET /live returns 200", async () => {
  const app = await createApp();

  const response = await app.inject({
    method: "GET",
    url: "/live",
  });

  expect(response.statusCode).toBe(200);
});

test("GET /info returns 200", async () => {
  const app = await createApp();

  const response = await app.inject({
    method: "GET",
    url: "/info",
  });

  expect(response.statusCode).toBe(200);
});
