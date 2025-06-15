# Adding Providers to ConnectHub

This guide provides comprehensive instructions for adding new providers and capabilities to the ConnectHub integration layer. Follow these patterns and conventions to ensure consistency and maintainability.

## Overview

ConnectHub uses a provider-based architecture where each external service (Slack, QuickBooks, GSuite) is implemented as a `ProviderRuntime` with multiple capabilities. Each capability represents a specific action that can be performed via the provider's API.

## Provider Architecture

### Core Components

1. **ProviderRuntime**: Main provider class implementing the provider interface
2. **Capabilities**: Individual actions/operations the provider can perform
3. **Schemas**: TypeBox schemas for parameter validation and type safety
4. **Prompts**: Versioned prompts that guide AI agents in using capabilities
5. **Documentation URLs**: Specific API endpoint documentation links

### File Structure

```
connect_hub/src/integrations/
├── {provider-name}.ts              # Main provider implementation
└── {provider-name}/
    └── prompts/
        ├── {capability-id}-1.0.0.json
        ├── {capability-id}-1.0.0.json
        └── ...
```

## Step-by-Step Provider Creation

### 1. Create the Provider File

Create `connect_hub/src/integrations/{provider-name}.ts` with the following structure:

```typescript
import {
  ProviderRuntime,
  Capability,
  ExecutionContext,
  CapabilityMeta,
} from "../providers/types.js";
import { ProviderKind, ProviderAuth } from "../models/capabilities.js";
import { Type, Static } from "@sinclair/typebox";
import { loadPrompts } from "../providers/utils.js";
const __dirname = import.meta.dirname;

// ---------------------------------------------------------------------------
// API Helper Function
// ---------------------------------------------------------------------------
async function {provider}Fetch<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  params?: unknown,
  ctx?: ExecutionContext,
): Promise<T> {
  if (!ctx?.accessToken) throw new Error("{Provider} access token missing");
  
  const baseUrl = "https://api.{provider}.com"; // Replace with actual base URL
  const url = `${baseUrl}${endpoint}`;
  
  const res = await globalThis.fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      "Content-Type": "application/json",
      // Add any provider-specific headers
    },
    body: method !== "GET" ? JSON.stringify(params ?? {}) : undefined,
  });

  // Handle rate limiting
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") ?? "60";
    throw new Error(`Rate limited; retry after ${retryAfter}s`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`{Provider} HTTP ${res.status}: ${text}`);
  }

  return res.json() as T;
}

// ---------------------------------------------------------------------------
// Capability Schemas (use TypeBox Static pattern)
// ---------------------------------------------------------------------------

const {capability}ParamsSchema = Type.Object({
  // Define parameters with proper validation
  param1: Type.String({ description: "Description of parameter" }),
  param2: Type.Optional(Type.Number({ minimum: 0 })),
  // Use appropriate TypeBox validators
});

const {capability}ResultSchema = Type.Object({
  // Define expected response structure
  id: Type.String(),
  status: Type.String(),
  // Match the actual API response structure
});

// ---------------------------------------------------------------------------
// Type definitions derived from schemas (TypeBox Static pattern)
// ---------------------------------------------------------------------------

type {Capability}Params = Static<typeof {capability}ParamsSchema>;
type {Capability}Result = Static<typeof {capability}ResultSchema>;

// ---------------------------------------------------------------------------
// Capability implementations
// ---------------------------------------------------------------------------

async function {provider}{Capability}(
  params: {Capability}Params,
  ctx: ExecutionContext
): Promise<{Capability}Result> {
  // Transform params if needed for the API
  const apiParams = {
    // Map internal params to API params
  };
  
  return {provider}Fetch<{Capability}Result>(
    "/api/endpoint",
    "POST",
    apiParams,
    ctx
  );
}

// ---------------------------------------------------------------------------
// Provider Class
// ---------------------------------------------------------------------------

export class {Provider}Provider implements ProviderRuntime {
  private cache = new Map<string, Capability>();

  public readonly metadata = {
    id: "{provider-id}",
    displayName: "{Provider Display Name}",
    description: "Description of what this provider does",
    icon: "https://example.com/icon.png",
    docsUrl: "https://developer.{provider}.com/docs",
    kind: ProviderKind.External,
    auth: ProviderAuth.OAuth2, // or OAuth1, ApiKey, etc.
  } as const;

  getCapability<P, R>(capId: string): Capability<P, R> {
    if (!this.cache.has(capId)) {
      switch (capId) {
        case "{capability.id}": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Capability Display Name",
            description: "What this capability does",
            docsUrl: "https://developer.{provider}.com/docs/api/specific-endpoint",
            paramsSchema: {capability}ParamsSchema,
            resultSchema: {capability}ResultSchema,
            requiredScopes: ["scope1", "scope2"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: {provider}{Capability} });
          break;
        }
        // Add more capabilities...
        default:
          throw new Error(`{Provider} capability ${capId} not implemented`);
      }
    }
    return this.cache.get(capId)! as Capability<P, R>;
  }

  listCapabilities() {
    const knownCapabilities = ["{capability.id}", /* ... */];
    knownCapabilities.forEach((k) => this.getCapability(k));
    return [...this.cache.values()].map((c) => c.meta);
  }
}
```

### 2. Schema Design Patterns

#### Use TypeBox Static Pattern
```typescript
// ✅ CORRECT: Use TypeBox Static pattern
const paramsSchema = Type.Object({
  email: Type.String({ format: "email" }),
  amount: Type.Number({ minimum: 0 })
});

type Params = Static<typeof paramsSchema>;

// ❌ INCORRECT: Don't define separate interfaces
interface Params {
  email: string;
  amount: number;
}
```

#### Common TypeBox Patterns
```typescript
// Strings with validation
Type.String({ format: "email" })
Type.String({ format: "date" })
Type.String({ format: "date-time" })
Type.String({ minLength: 1, maxLength: 100 })

// Numbers with constraints
Type.Number({ minimum: 0, maximum: 1000 })
Type.Integer({ minimum: 1 })

// Optional fields
Type.Optional(Type.String())

// Arrays
Type.Array(Type.String())
Type.Array(Type.Object({ id: Type.String() }))

// Enums/Unions
Type.Union([
  Type.Literal("option1"),
  Type.Literal("option2")
])

// Nested objects
Type.Object({
  address: Type.Object({
    street: Type.String(),
    city: Type.String(),
    zipCode: Type.String()
  })
})
```

### 3. API Helper Function Patterns

#### Standard HTTP Client
```typescript
async function providerFetch<T>(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  params?: unknown,
  ctx?: ExecutionContext,
): Promise<T> {
  if (!ctx?.accessToken) throw new Error("Access token missing");
  
  const res = await globalThis.fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      "Content-Type": "application/json",
    },
    body: method !== "GET" ? JSON.stringify(params ?? {}) : undefined,
  });

  // Always handle rate limiting
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") ?? "60";
    throw new Error(`Rate limited; retry after ${retryAfter}s`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json() as T;
}
```

#### Multi-Service Providers (like GSuite)
```typescript
async function gsuiteFetch<T>(
  service: "gmail" | "calendar" | "drive",
  endpoint: string,
  method: string,
  params?: unknown,
  ctx?: ExecutionContext,
): Promise<T> {
  const baseUrls = {
    gmail: "https://gmail.googleapis.com/gmail/v1",
    calendar: "https://www.googleapis.com/calendar/v3",
    drive: "https://www.googleapis.com/drive/v3"
  };
  
  const url = `${baseUrls[service]}${endpoint}`;
  // ... rest of implementation
}
```

### 4. Capability Naming Conventions

#### Capability IDs
- Use dot notation: `{service}.{action}`
- Examples: `chat.post`, `invoice.create`, `gmail.send`, `calendar.event.create`
- Be specific and descriptive
- Use verbs for actions: `create`, `update`, `delete`, `list`, `send`

#### Function Names
- Combine provider + capability: `{provider}{Capability}`
- Examples: `slackChatPost`, `qbInvoiceCreate`, `gmailSend`
- Use PascalCase for capability part

### 5. Error Handling Patterns

```typescript
// Rate limiting
if (res.status === 429) {
  const retryAfter = res.headers.get("Retry-After") ?? "60";
  throw new Error(`Rate limited; retry after ${retryAfter}s`);
}

// General HTTP errors
if (!res.ok) {
  const text = await res.text();
  throw new Error(`{Provider} HTTP ${res.status}: ${text}`);
}

// Provider-specific errors (e.g., Slack)
const data = await res.json();
if (data.ok === false) {
  throw new Error(`{Provider} API error: ${data.error}`);
}
```

### 6. Create Capability Prompts

Create `connect_hub/src/integrations/{provider}/prompts/{capability-id}-1.0.0.json`:

```json
{
  "version": "1.0.0",
  "modelHint": "gpt-4o-mini",
  "system": "You are a service that formats parameters for {Provider}'s {capability} API. Provide specific guidance about parameter formatting, validation rules, and API requirements. Return only JSON.",
  "user": "Clear instructions for agents on how to use this capability in context. Include any important formatting rules or business logic.",
  "fewShot": [
    {
      "input": "Realistic example of what an agent might be asked to do",
      "output": {
        "param1": "example_value",
        "param2": 123
      }
    },
    {
      "input": "Another realistic example showing different parameter combinations",
      "output": {
        "param1": "different_value",
        "param3": true
      }
    }
  ]
}
```

#### Prompt Best Practices

1. **System Prompt**: Include API-specific requirements and formatting rules
2. **User Prompt**: Provide context-aware guidance for business scenarios
3. **Few-Shot Examples**: 2-4 realistic examples showing proper parameter usage
4. **Parameter Validation**: Guide agents on required vs optional parameters
5. **Business Context**: Show how the capability fits into real workflows

## Provider-Specific Patterns

### OAuth2 Providers (Most Common)
```typescript
public readonly metadata = {
  // ...
  auth: ProviderAuth.OAuth2,
}
```

### API Key Providers
```typescript
// In the fetch function, use API key instead of Bearer token
headers: {
  "X-API-Key": ctx.apiKey,
  "Content-Type": "application/json",
}
```

### Complex Authentication
```typescript
// For providers with custom auth schemes
headers: {
  Authorization: `Custom ${ctx.accessToken}`,
  "X-Custom-Header": "value",
}
```

## Documentation URLs

### Provider-Level Documentation
- Point to the main developer documentation
- Example: `https://developers.google.com/workspace`

### Capability-Level Documentation
- Point to specific API endpoint documentation
- Example: `https://api.slack.com/methods/chat.postMessage`
- Include anchor links to specific sections when available

## Testing Considerations

### Schema Validation
- Ensure schemas match actual API requirements
- Test with real API responses to validate result schemas
- Use TypeBox's validation features for runtime checking

### Error Scenarios
- Test rate limiting responses
- Test authentication failures
- Test malformed parameter handling

### Business Logic
- Test parameter transformation logic
- Verify API-specific requirements (e.g., Slack channel naming)
- Test optional parameter handling

## Common Pitfalls to Avoid

1. **❌ Don't use `any` types**: Always use proper TypeBox schemas and Static types
2. **❌ Don't hardcode values**: Use parameters and configuration
3. **❌ Don't ignore rate limiting**: Always handle 429 responses
4. **❌ Don't skip error handling**: Provide meaningful error messages
5. **❌ Don't forget optional parameters**: Use `Type.Optional()` appropriately
6. **❌ Don't mix schema and interface definitions**: Use TypeBox Static pattern consistently

## Integration Checklist

- [ ] Provider file created with proper structure
- [ ] All capabilities implemented with TypeBox schemas
- [ ] API helper function with rate limiting and error handling
- [ ] Capability metadata with documentation URLs
- [ ] Prompt files created for each capability
- [ ] Provider metadata configured correctly
- [ ] Required scopes defined for each capability
- [ ] TypeBox Static pattern used throughout
- [ ] Error handling implemented
- [ ] Business logic validated

## Examples

Refer to existing providers for implementation examples:
- **Slack**: Simple OAuth2 provider with straightforward API
- **QuickBooks**: Complex business logic with parameter transformation
- **GSuite**: Multi-service provider with unified authentication

Each provider demonstrates different patterns and can serve as a template for similar integrations. 