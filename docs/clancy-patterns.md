# Clancy AI Development Patterns

This document outlines the mandatory patterns and standards for development across all Clancy services. Every service must follow these patterns to ensure consistency, type safety, and proper documentation.

## 1. OpenAPI Specification Generation

### 1.1 Required Dependencies

All services must include these dependencies for OpenAPI generation:

```json
{
  "dependencies": {
    "@fastify/swagger": "^9.5.1",
    "@fastify/type-provider-typebox": "^5.1.0", 
    "@scalar/fastify-api-reference": "^1.31.4",
    "@sinclair/typebox": "^0.34.33"
  }
}
```

### 1.2 Fastify Application Setup

Every service must register OpenAPI generation in their main application file:

```typescript
import swagger from "@fastify/swagger";
import apiReference from "@scalar/fastify-api-reference";
import packageJson from '../package.json';

// Register Swagger for OpenAPI generation
await app.register(swagger, {
  hideUntagged: true,
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "{ServiceName} API",
      description: "{ServiceName} API",
      version: packageJson.version,
    },
    servers: [],
    tags: [],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    externalDocs: {
      url: "https://swagger.io",
      description: "Find more info here",
    },
  },
  refResolver: {
    buildLocalReference(json, baseUri, fragment, i) {
      if (!json.title && json.$id) {
        json.title = json.$id;
      }
      // Fallback if no $id is present
      if (!json.$id) {
        return `def-${i}`;
      }
      return `${json.$id}`;
    },
  },
});

// OpenAPI JSON endpoint
app.get("/openapi.json", async (request: FastifyRequest, reply: FastifyReply) => {
  return app.swagger();
});

// API Reference UI
await app.register(apiReference, {
  routePrefix: "/reference",
  configuration: {
    url: "/openapi.json",
  },
});
```

### 1.3 Schema-First Design

All APIs must use schema-first design with TypeBox:

```typescript
import { Type } from '@sinclair/typebox';

// Define schemas first
const UserSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  email: Type.String({ format: 'email' }),
  createdAt: Type.String({ format: 'date-time' }),
});

const CreateUserSchema = Type.Object({
  name: Type.String(),
  email: Type.String({ format: 'email' }),
});

// Use in route definitions
app.post('/users', {
  schema: {
    body: CreateUserSchema,
    response: {
      201: UserSchema,
      400: ErrorSchema,
    },
  },
}, async (request, reply) => {
  // Implementation
});
```
### 1.4 Typesafe Database Schemas and migrations
Database tables are defined using the drizzle ORM

```typescript
// 1. Model Definition (in src/models/)
export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    brand_id: uuid('brand_id').references(() => brands.id).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull()
});
```

Migrations are generated using drizzle-migration by the user. There is no need for independent migration files.

## 2. TypeScript Integration

### 2.1 FastifyTypeBox Types

Every service must define strongly typed request/reply handlers in `src/types/fastify.d.ts`:

```typescript
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { 
  FastifyInstance, 
  FastifyRequest, 
  FastifyReply,
  FastifySchema,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  RouteGenericInterface,
  ContextConfigDefault
} from 'fastify';

export type FastifyTypeBox = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  TypeBoxTypeProvider
>;

export type FastifyRequestTypeBox<TSchema extends FastifySchema> =
  FastifyRequest<
    RouteGenericInterface,
    RawServerDefault,
    RawRequestDefaultExpression,
    TSchema,
    TypeBoxTypeProvider
  >;

export type FastifyReplyTypeBox<TSchema extends FastifySchema> = FastifyReply<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  ContextConfigDefault,
  TSchema,
  TypeBoxTypeProvider
>;
```

### 2.2 Route Handler Typing

All route handlers must be strongly typed:

```typescript
import type { FastifyRequestTypeBox, FastifyReplyTypeBox } from '../types/fastify.js';

// Instead of generic request/reply
app.get('/health', {
  schema: {
    response: {
      200: HealthResponseSchema,
      503: HealthResponseSchema,
    },
  },
}, async (
  request: FastifyRequestTypeBox<typeof HealthResponseSchema>, 
  reply: FastifyReplyTypeBox<typeof HealthResponseSchema>
) => {
  // Implementation with full type safety
});
```

### 2.3 Service Declaration

Services must be declared via Fastify module augmentation:

```typescript
// In src/types/fastify.d.ts
declare module 'fastify' {
  export interface FastifyInstance {
    // Core services
    tokenService: TokenService;
    auditService: AuditService;
    
    // Configuration
    config: {
      nodeEnv: string;
      port: number;
      // ... other config
    };
  }
}
```

## 3. API Documentation Standards

### 3.1 Endpoint Documentation

Every endpoint must have:

- **Clear description** in the schema
- **Appropriate HTTP status codes** (200, 201, 400, 401, 403, 404, 500, 503)
- **Request/response examples** via TypeBox schemas
- **Security requirements** defined where applicable

### 3.2 Error Handling

Standard error response schema:

```typescript
const ErrorSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number(),
  timestamp: Type.String({ format: 'date-time' }),
  path: Type.Optional(Type.String()),
  details: Type.Optional(Type.Unknown()),
});
```

### 3.3 Health Check Endpoints

Every service must implement standard health check endpoints:

- `GET /health` - Comprehensive health check with dependencies
- `GET /ready` - Kubernetes readiness probe
- `GET /live` - Kubernetes liveness probe
- `GET /info` - Service information
- `GET /metrics` - Prometheus metrics

## 4. Security Standards

### 4.1 Authentication

All protected endpoints must define security requirements:

```typescript
app.post('/protected', {
  schema: {
    security: [{ bearerAuth: [] }],
    response: {
      200: ResponseSchema,
      401: ErrorSchema,
    },
  },
}, async (request, reply) => {
  // Implementation
});
```

### 4.2 Input Validation

All inputs must be validated via TypeBox schemas:

```typescript
const CreateResourceSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  tags: Type.Optional(Type.Array(Type.String())),
});
```

## 5. Performance Standards

### 5.1 Response Time Targets

- **Health checks**: < 50ms
- **Token operations**: < 200ms  
- **Policy evaluations**: < 100ms
- **API calls**: < 500ms

### 5.2 Caching Strategy

Services should implement appropriate caching:

```typescript
// Redis caching example
const cacheKey = `resource:${id}`;
const cached = await app.redisService.get(cacheKey);
if (cached) {
  return reply.send(JSON.parse(cached));
}

const result = await fetchResource(id);
await app.redisService.setex(cacheKey, 300, JSON.stringify(result));
return reply.send(result);
```

## 6. Logging Standards

### 6.1 Request Logging

All services must implement structured request logging:

```typescript
app.addHook('onRequest', async (request) => {
  request.log.info({
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    correlationId: request.headers['x-correlation-id'],
  }, 'Request received');
});

app.addHook('onResponse', async (request, reply) => {
  request.log.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    responseTime: reply.getResponseTime(),
  }, 'Request completed');
});
```

### 6.2 Error Logging

Errors must be logged with appropriate context:

```typescript
try {
  // Operation
} catch (error) {
  request.log.error({
    error: error.message,
    stack: error.stack,
    operation: 'create_user',
    userId: request.body.id,
  }, 'Operation failed');
  
  return reply.status(500).send({
    error: 'Internal Server Error',
    message: 'Operation failed',
    statusCode: 500,
    timestamp: new Date().toISOString(),
  });
}
```

## 7. Testing Standards

### 7.1 API Testing

All endpoints must have tests covering:

- **Happy path scenarios**
- **Error conditions**
- **Input validation**
- **Authentication/authorization**

```typescript
import { test, expect } from 'vitest';
import { createApp } from '../src/app.js';

test('GET /health returns 200', async () => {
  const app = await createApp();
  const response = await app.inject({
    method: 'GET',
    url: '/health',
  });
  
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    status: 'healthy',
    timestamp: expect.any(String),
  });
});
```

## 8. Deployment Standards


### 8.1 Graceful Shutdown

All services must implement graceful shutdown:

```typescript
const gracefulShutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await app.close();
    app.log.info('Application closed successfully');
    process.exit(0);
  } catch (error) {
    app.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## 9. Compliance Checklist

Before deploying any API service, ensure:

- [ ] OpenAPI spec is auto-generated and accessible at `/openapi.json`
- [ ] Interactive API documentation is available at `/reference`
- [ ] All route handlers use `FastifyRequestTypeBox` and `FastifyReplyTypeBox`
- [ ] All endpoints have proper schema validation
- [ ] Standard health check endpoints are implemented
- [ ] Error responses follow the standard format
- [ ] Security schemes are properly defined
- [ ] Request/response logging is implemented
- [ ] Graceful shutdown is implemented
- [ ] Environment variables are properly validated
- [ ] Tests cover all endpoints and error scenarios

## 10. Development Workflow

### 10.1 API-First Development

1. **Define schemas** using TypeBox
2. **Generate OpenAPI spec** automatically
3. **Implement route handlers** with proper typing
4. **Write tests** covering all scenarios
5. **Update documentation** as needed

### 10.2 Code Review Requirements

Pull requests must include:

- [ ] OpenAPI spec changes (if applicable)
- [ ] Type definitions for new endpoints
- [ ] Comprehensive tests
- [ ] Updated documentation
- [ ] Performance considerations

---

**Note**: This document should be referenced in all service development and code reviews. Any deviations from these standards must be documented and justified.

*Last updated: 2025-01-01* 