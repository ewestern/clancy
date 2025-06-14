# ConnectHub

Unified integration, token, and proxy layer for Clancy Digital-Employees.

## Overview

ConnectHub is a Node.js + Fastify + TypeScript service that provides:

- **OAuth Management**: Handle OAuth flows and credential storage
- **Token Management**: Store and refresh third-party tokens using Auth0 integration
- **API Proxy**: Execute capability requests on behalf of agents
- **Integration Catalog**: Maintain catalog of available integrations and actions
- **Rate Limiting**: Manage API quotas and request throttling
- **Secure Proxy**: Zero raw tokens exposed to workers

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify with TypeBox type provider
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Auth0 M2M tokens + JWT validation
- **API Documentation**: Auto-generated OpenAPI 3.0
- **Testing**: Vitest for unit and integration tests

## Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- Auth0 account and configuration

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env

# Configure your environment variables in .env
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build the application
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Generate database schema
npm run db:generate

# Run database migrations
npm run db:migrate
```

### Environment Variables

| Variable         | Description        | Default                |
| ---------------- | ------------------ | ---------------------- |
| `NODE_ENV`       | Environment mode   | `development`          |
| `PORT`           | Server port        | `3000`                 |
| `LOG_LEVEL`      | Logging level      | `info`                 |
| `DB_HOST`        | Database host      | `localhost`            |
| `DB_PORT`        | Database port      | `5432`                 |
| `DB_USER`        | Database user      | `postgres`             |
| `DB_PASSWORD`    | Database password  | `postgres`             |
| `DB_NAME`        | Database name      | `connect_hub`          |
| `AUTH0_DOMAIN`   | Auth0 domain       | Required in production |
| `AUTH0_AUDIENCE` | Auth0 API audience | Required in production |
| `AUTH0_ISSUER`   | Auth0 issuer URL   | Required in production |

## API Documentation

Once the server is running, you can access:

- **Interactive API Documentation**: `http://localhost:3000/reference`
- **OpenAPI Specification**: `http://localhost:3000/openapi.json`
- **Health Check**: `http://localhost:3000/health`

## Architecture

ConnectHub follows the clancy-patterns architecture with:

- **Schema-first API design** using TypeBox
- **Type-safe database operations** with Drizzle ORM
- **Structured logging** and monitoring
- **Auto-generated OpenAPI documentation**
- **Comprehensive health checks**

## Development Patterns

This service follows the [Clancy Development Patterns](../docs/clancy-patterns.md) including:

- TypeScript strict mode with comprehensive type safety
- FastifyTypeBox request/reply handlers
- Auto-generated OpenAPI specifications
- Structured error handling and logging
- Comprehensive testing coverage

## Project Structure

```
connect_hub/
├── src/
│   ├── adapters/           # Provider-specific adapters
│   ├── middleware/         # Request/response middleware
│   ├── models/            # Database models (Drizzle ORM)
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   ├── app.ts             # Main Fastify application
│   ├── config.ts          # Configuration management
│   └── server.ts          # Server entry point
├── tests/
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
├── migrations/            # Database migrations
├── package.json
├── tsconfig.json
├── drizzle.config.ts
└── README.md
```

## Contributing

1. Follow the clancy-patterns for all development
2. Ensure all endpoints have proper TypeBox schemas
3. Write comprehensive tests for new features
4. Update OpenAPI documentation automatically via schemas
5. Follow structured logging patterns

## License

Proprietary - Clancy Digital-Employees
