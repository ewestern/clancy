import { test, expect } from 'vitest';
import { createApp } from '../src/app.js';

test('GET /health returns 200', async () => {
  const app = await createApp();
  
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });
  
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body).toMatchObject({
    status: expect.any(String),
    timestamp: expect.any(String),
    version: expect.any(String),
    dependencies: expect.any(Object),
  });
  
  await app.close();
});

test('GET /ready returns 200', async () => {
  const app = await createApp();
  
  const response = await app.inject({
    method: 'GET',
    url: '/ready',
  });
  
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body).toMatchObject({
    status: expect.any(String),
    timestamp: expect.any(String),
  });
  
  await app.close();
});

test('GET /live returns 200', async () => {
  const app = await createApp();
  
  const response = await app.inject({
    method: 'GET',
    url: '/live',
  });
  
  expect(response.statusCode).toBe(200);
  const body = response.json();
  expect(body).toMatchObject({
    status: 'alive',
    timestamp: expect.any(String),
  });
  
  await app.close();
}); 