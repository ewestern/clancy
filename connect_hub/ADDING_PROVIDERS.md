# Adding Providers to ConnectHub

This guide provides comprehensive instructions for adding new providers and capabilities to the ConnectHub integration layer. Follow these patterns and conventions to ensure consistency and maintainability.

## Overview

ConnectHub uses a provider-based architecture where each external service (Slack, QuickBooks, Google) is implemented as a `ProviderRuntime` with multiple capabilities. Each capability represents a specific action that can be performed via the provider's API.

## Provider Architecture

### Core Components

1. **ProviderRuntime**: Main provider class implementing the provider interface
2. **Capabilities**: Individual actions/operations the provider can perform
3. **Schemas**: TypeBox schemas for parameter validation and type safety
4. **Documentation URLs**: Specific API endpoint documentation links
5. **Risk Assessment**: Risk level classification for each capability
6. **OAuth Methods**: Token management and scope validation (for external providers)
7. **Service Modules**: Separate files for different services within a provider

### Webhook and Trigger System (optional)

If your provider exposes inbound webhooks (e.g. Slack Events API), implement them using the `Webhook<S, E>` and `ProviderRuntime<S, E>` types. The webhook system includes a trigger mechanism for event-driven agent workflows.

**Key Components:**
- **Webhook Event Schemas**: TypeBox schemas defining incoming event structure
- **Triggers**: Logic to determine which registered triggers should fire for an event
- **Trigger Registrations**: Database records linking triggers to specific agent workflows  
- **Event Creation**: Transform webhook events into agent-consumable events
- **Webhook Verification**: Provider-specific signature verification for security

**Implementation Pattern:**

1. **Define Event Schemas and Endpoint**
   - Create TypeBox schemas for all expected webhook event types
   - Define webhook endpoint schema with proper request/response structure

2. **Implement Webhook Handler** 
   - Verify webhook authenticity using provider-specific signature verification
   - Implement timestamp validation to prevent replay attacks
   - Handle challenge/verification flows (like Slack URL verification)
   - Route events to appropriate triggers

3. **Define Triggers with Event Logic**
   - Create trigger definitions with `eventSatisfies` logic
   - Implement database queries to find matching trigger registrations
   - Transform webhook events into standardized agent events

4. **Register Webhooks with Triggers**
   - Associate triggers with webhook endpoints
   - Expose through provider's `webhooks` property

5. **Provider Implementation**
   - Use generic types: `ProviderRuntime<WebhookSchema, EventType>`
   - Expose webhooks via `webhooks` property

**Trigger Registration Pattern:**
- Query database for trigger registrations matching event context
- Filter by provider, external account, and trigger-specific criteria
- Return transformed trigger registration objects for agent consumption

**Event Transformation:**
- Convert provider webhook events into standardized agent event format
- Include partition keys for proper event ordering and processing
- Maintain correlation between webhook events and agent executions

### File Structure

```
connect_hub/src/integrations/
├── {provider-name}.ts              # Main provider implementation
└── {provider-name}/
    ├── {service-name}.ts           # Service-specific implementations
    ├── {service-name}.ts           # Additional services (e.g., gmail.ts, calendar.ts)

```

## Step-by-Step Provider Creation

### 1. Create Service Module Files (for multi-service providers)

For providers with multiple services (like Google with Gmail + Calendar), create separate service files:

Create `connect_hub/src/integrations/{provider-name}/{service-name}.ts`:

```typescript
import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
// Import provider-specific SDK if available

// ---------------------------------------------------------------------------
// API Helper Function
// ---------------------------------------------------------------------------
function create{Service}Client(ctx: ExecutionContext) {
  if (!ctx?.accessToken) throw new Error("{Provider} access token missing");

  // Initialize provider-specific client with token
  // Example: return providerSdk.createClient({ accessToken: ctx.accessToken });
}

// ---------------------------------------------------------------------------
// Capability Schemas (use TypeBox Static pattern)
// ---------------------------------------------------------------------------

export const {service}{capability}ParamsSchema = Type.Object({
  // Define parameters with proper validation
  param1: Type.String({ description: "Description of parameter" }),
  param2: Type.Optional(Type.Number({ minimum: 0 })),
  // Use appropriate TypeBox validators
});

export const {service}{capability}ResultSchema = Type.Object({
  // Define expected response structure
  id: Type.String(),
  status: Type.String(),
  // Match the actual API response structure
});

// ---------------------------------------------------------------------------
// Type definitions derived from schemas (TypeBox Static pattern)
// ---------------------------------------------------------------------------

export type {Service}{Capability}Params = Static<typeof {service}{capability}ParamsSchema>;
export type {Service}{Capability}Result = Static<typeof {service}{capability}ResultSchema>;

// ---------------------------------------------------------------------------
// Capability implementations
// ---------------------------------------------------------------------------

export async function {service}{Capability}(
  params: {Service}{Capability}Params,
  ctx: ExecutionContext
): Promise<{Service}{Capability}Result> {
  const client = create{Service}Client(ctx);

  try {
    // Use provider SDK or direct API calls
    const response = await client.someMethod(params);
    return response.data;
  } catch (error: any) {
    // Handle rate limiting
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`{Service} {capability} error: ${error.message}`);
  }
}
```

### 2. Create the Main Provider File

Create `connect_hub/src/integrations/{provider-name}.ts` using the dispatch table pattern:

```typescript
import {
  ProviderRuntime,
  Capability,
  ExecutionContext,
  CapabilityMeta,
  CapabilityFactory,
  CapabilityRisk,
  OAuthAuthUrlParams,
  OAuthCallbackParams,
  OAuthContext,
  CallbackResult,
} from "../providers/types.js";
import { ProviderKind, ProviderAuth } from "../models/capabilities.js";

// Import service modules
import {
  {service}{capability},
  {service}{capability}ParamsSchema,
  {service}{capability}ResultSchema,
} from "./{provider-name}/{service-name}.js";

const __dirname = import.meta.dirname;

// ---------------------------------------------------------------------------
// Capability Factory Functions
// ---------------------------------------------------------------------------

function create{Service}{Capability}Capability(): Capability<{Service}{Capability}Params, {Service}{Capability}Result> {
  const meta: CapabilityMeta = {
    id: "{service}.{capability}",
    displayName: "Capability Display Name",
    description: "What this capability does",
    docsUrl: "https://developer.{provider}.com/docs/api/specific-endpoint",
    paramsSchema: {service}{capability}ParamsSchema,
    resultSchema: {service}{capability}ResultSchema,
    requiredScopes: ["scope1", "scope2"],
    risk: CapabilityRisk.MEDIUM, // Assess risk level appropriately
  };
  
  return {
    meta,
    execute: {service}{capability},
  };
}

// Add more capability factory functions...

// ---------------------------------------------------------------------------
// Provider Class
// ---------------------------------------------------------------------------

// For providers with webhooks, use: implements ProviderRuntime<WebhookSchema, EventType>
export class {Provider}Provider implements ProviderRuntime {
  private readonly dispatchTable = new Map<string, Capability<any, any>>();
  public readonly scopeMapping: Record<string, string[]>;

  // Optional: External management links (e.g. provider app configuration)
  links = [
    "https://developer.{provider}.com/apps/your-app-id/settings"
  ];

  public readonly metadata = {
    id: "{provider-id}",
    displayName: "{Provider Display Name}",
    description: "Description of what this provider does",
    icon: "https://example.com/icon.png",
    docsUrl: "https://developer.{provider}.com/docs",
    kind: ProviderKind.External,
    auth: ProviderAuth.OAuth2, // or OAuth1, ApiKey, etc.
  } as const;

  constructor() {
    // Define capability factories
    const capabilityFactories: Record<string, CapabilityFactory> = {
      "{service}.{capability}": create{Service}{Capability}Capability,
      // Add more capabilities...
    };

    // Populate dispatch table
    for (const [capabilityId, factory] of Object.entries(capabilityFactories)) {
      this.dispatchTable.set(capabilityId, factory());
    }

    // Generate scopeMapping from dispatch table (scope -> capability IDs)
    this.scopeMapping = {};
    for (const [capabilityId, capability] of this.dispatchTable) {
      for (const scope of capability.meta.requiredScopes) {
        if (!this.scopeMapping[scope]) {
          this.scopeMapping[scope] = [];
        }
        this.scopeMapping[scope].push(capabilityId);
      }
    }
  }

  getCapability<P, R>(capabilityId: string): Capability<P, R> {
    const capability = this.dispatchTable.get(capabilityId);
    if (!capability) {
      throw new Error(`{Provider} capability ${capabilityId} not implemented`);
    }
    return capability as Capability<P, R>;
  }

  // Optional: Webhook support (add if provider supports webhooks)
  webhooks = webhooks;

  listCapabilities(): CapabilityMeta[] {
    return Array.from(this.dispatchTable.values()).map((c) => c.meta);
  }

  // ... OAuth methods implementation
}
```

### 3. Risk Assessment Guidelines

Each capability must include a risk assessment using `CapabilityRisk`:

#### Risk Levels

- **`CapabilityRisk.HIGH`**: Operations that can have significant business impact
  - Sending emails/messages to external parties
  - Creating financial transactions (invoices, payments)
  - Modifying critical business data
  - Actions that can't be easily undone

- **`CapabilityRisk.MEDIUM`**: Operations that modify data but have limited external impact
  - Creating/modifying internal records (customers, labels)
  - Uploading files
  - Creating calendar events
  - Actions that can be undone with effort

- **`CapabilityRisk.LOW`**: Read-only operations with minimal risk
  - Listing/searching data
  - Reading files or messages
  - Getting metadata
  - Actions that don't modify anything

#### Risk Assessment Examples

```typescript
// HIGH RISK: Sends external communication
function createGmailSendCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.send",
    displayName: "Send Email",
    description: "Send an email via Gmail",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send",
    paramsSchema: gmailSendParamsSchema,
    resultSchema: gmailSendResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    risk: CapabilityRisk.HIGH, // External communication impact
  };
  return { meta, execute: gmailSend };
}

// MEDIUM RISK: Creates internal data
function createSlackConversationCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "conversation.create",
    displayName: "Create Conversation",
    description: "Create a channel or private group",
    docsUrl: "https://api.slack.com/methods/conversations.create",
    paramsSchema: convCreateParamsSchema,
    resultSchema: convCreateResultSchema,
    requiredScopes: ["channels:manage"],
    risk: CapabilityRisk.MEDIUM, // Creates internal resource
  };
  return { meta, execute: slackConversationCreate };
}

// LOW RISK: Read-only operation
function createGmailSearchCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.search",
    displayName: "Search Emails",
    description: "Search for emails using Gmail query syntax",
    docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list",
    paramsSchema: gmailSearchParamsSchema,
    resultSchema: gmailSearchResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    risk: CapabilityRisk.LOW, // Read-only operation
  };
  return { meta, execute: gmailSearch };
}
```

### 4. Schema Design Patterns

#### Use TypeBox Static Pattern

```typescript
// ✅ CORRECT: Use TypeBox Static pattern
const paramsSchema = Type.Object({
  email: Type.String({ format: "email" }),
  amount: Type.Number({ minimum: 0 }),
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
Type.String({ format: "email" });
Type.String({ format: "date" });
Type.String({ format: "date-time" });
Type.String({ minLength: 1, maxLength: 100 });

// Numbers with constraints
Type.Number({ minimum: 0, maximum: 1000 });
Type.Integer({ minimum: 1 });

// Optional fields
Type.Optional(Type.String());

// Arrays
Type.Array(Type.String());
Type.Array(Type.Object({ id: Type.String() }));

// Enums/Unions
Type.Union([Type.Literal("option1"), Type.Literal("option2")]);

// Nested objects
Type.Object({
  address: Type.Object({
    street: Type.String(),
    city: Type.String(),
    zipCode: Type.String(),
  }),
});
```

#### Provide full, coherent examples for all each request and response.

```typescript
export const gmailLabelsGetResultSchema = Type.Object(
  {
    id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    type: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    messageListVisibility: Type.Optional(
      Type.Union([Type.String(), Type.Null()]),
    ),
    labelListVisibility: Type.Optional(
      Type.Union([Type.String(), Type.Null()]),
    ),
    color: Type.Optional(
      Type.Object({
        textColor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        backgroundColor: Type.Optional(
          Type.Union([Type.String(), Type.Null()]),
        ),
      }),
    ),
    messagesTotal: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    messagesUnread: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    threadsTotal: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    threadsUnread: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  },
  {
    examples: [
      {
        id: "123",
        name: "Inbox",
        type: "user",
        messageListVisibility: "show",
        labelListVisibility: "labelShow",
        color: {
          textColor: "#000000",
          backgroundColor: "#FFFFFF",
        },
        messagesTotal: 100,
        messagesUnread: 10,
        threadsTotal: 10,
        threadsUnread: 1,
      },
    ],
  },
);
```

### 5. API Helper Function Patterns

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

#### Multi-Service Providers

```typescript
async function googleFetch<T>(
  service: "gmail" | "calendar" | "drive",
  endpoint: string,
  method: string,
  params?: unknown,
  ctx?: ExecutionContext,
): Promise<T> {
  const baseUrls = {
    gmail: "https://gmail.googleapis.com/gmail/v1",
    calendar: "https://www.googleapis.com/calendar/v3",
    drive: "https://www.googleapis.com/drive/v3",
  };

  const url = `${baseUrls[service]}${endpoint}`;
  // ... rest of implementation
}
```

### 6. Capability Naming Conventions

#### Capability IDs

- Use dot notation: `{service}.{action}`
- Examples: `chat.post`, `invoice.create`, `gmail.send`, `calendar.event.create`
- Be specific and descriptive
- Use verbs for actions: `create`, `update`, `delete`, `list`, `send`

#### Function Names

- Combine provider + capability: `{provider}{Capability}`
- Examples: `slackChatPost`, `qbInvoiceCreate`, `gmailSend`
- Use PascalCase for capability part

### 7. Error Handling Patterns

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


### 8. OAuth Implementation Patterns

#### OAuth2 with Authorization Code Flow

```typescript
generateAuthUrl(params: OAuthAuthUrlParams, ctx: OAuthContext): string {
  // Build authorization URL with required parameters
  const authUrl = new URL("https://provider.com/oauth/authorize");
  authUrl.searchParams.append("client_id", ctx.clientId);
  authUrl.searchParams.append("scope", params.scopes.join(" "));
  authUrl.searchParams.append("state", params.state);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("redirect_uri", ctx.redirectUri);

  return authUrl.toString();
}

async handleCallback(
  callbackParams: OAuthCallbackParams,
  ctx: OAuthContext,
): Promise<CallbackResult> {
  if (callbackParams.error) {
    throw new Error(`OAuth error: ${callbackParams.error_description || callbackParams.error}`);
  }

  // Exchange authorization code for tokens
  const tokenResponse = await fetch("https://provider.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: callbackParams.code,
      client_id: ctx.clientId,
      client_secret: ctx.clientSecret,
      redirect_uri: ctx.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
  }

  const tokens = await tokenResponse.json();

  // Extract provider-specific account metadata for connection identification
  const externalAccountMetadata = {
    // Provider-specific fields for account identification
    // Example: user_id, team_id, workspace_id, etc.
  };

  return {
    tokenPayload: tokens as Record<string, unknown>,
    scopes: tokens.scope ? tokens.scope.split(" ") : [],
    externalAccountMetadata,
  };
}
```

#### Using Provider SDKs (Google Example)

```typescript
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

generateAuthUrl(params: OAuthAuthUrlParams, ctx: OAuthContext): string {
  const oauth2Client = new google.auth.OAuth2(
    ctx.clientId,
    ctx.clientSecret,
    ctx.redirectUri
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: params.scopes,
    state: params.state,
  });
}

async handleCallback(
  callbackParams: OAuthCallbackParams,
  ctx: OAuthContext,
): Promise<CallbackResult> {
  const oauth2Client = new google.auth.OAuth2(
    ctx.clientId,
    ctx.clientSecret,
    ctx.redirectUri
  );

  const { tokens } = await oauth2Client.getToken(callbackParams.code);

  // Extract Google-specific account information
  const externalAccountMetadata = {
    // Could include user profile info, workspace details, etc.
    // Retrieved from additional API calls if needed
  };

  return {
    tokenPayload: tokens as Record<string, unknown>,
    scopes: tokens.scope?.split(" ") || [],
    externalAccountMetadata,
  };
}
```

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
7. **❌ Don't forget OAuth error handling**: Check for `error` parameter in callbacks
8. **❌ Don't ignore token expiration**: Implement `isTokenValid()` properly
9. **❌ Don't forget risk assessment**: Every capability must have appropriate risk level
10. **❌ Don't use dispatch table anti-patterns**: Don't add capabilities that aren't implemented

## Integration Checklist

### Core Implementation

- [ ] Provider file created with dispatch table pattern
- [ ] Service modules created for multi-service providers
- [ ] All capabilities implemented with TypeBox schemas
- [ ] Capability factory functions created
- [ ] Risk levels assessed for all capabilities
- [ ] API helper function with rate limiting and error handling
- [ ] Capability metadata with documentation URLs
- [ ] Provider metadata configured correctly
- [ ] External management links added (optional)
- [ ] Required scopes defined for each capability
- [ ] TypeBox Static pattern used throughout
- [ ] Error handling implemented
- [ ] Business logic validated
- [ ] Scope mapping generated from dispatch table

### Webhook & Trigger Implementation (optional)

- [ ] Webhook event schemas defined with TypeBox
- [ ] Webhook verification implemented for security
- [ ] Trigger definitions created with event satisfaction logic
- [ ] Database queries for trigger registrations implemented
- [ ] Event transformation logic implemented
- [ ] Webhook handler with proper error handling
- [ ] Challenge/verification flows handled (if applicable)

### OAuth Implementation (for external providers)

- [ ] `generateAuthUrl()` method implemented
- [ ] `handleCallback()` method with error handling
- [ ] `externalAccountMetadata` extraction for connection identification
- [ ] `refreshToken()` method implemented
- [ ] `isTokenValid()` method implemented
- [ ] OAuth error cases handled properly
- [ ] Token expiration logic implemented
- [ ] Scope validation tested

### Testing & Documentation

- [ ] Unit tests for all capabilities
- [ ] OAuth flow integration tests
- [ ] Error scenario testing
- [ ] Scope mapping validation
- [ ] Documentation updated

## Examples

Refer to existing providers for implementation examples:

- **Slack**: OAuth2 provider with dispatch table pattern, webhook support, and trigger system for event-driven workflows
- **QuickBooks**: Complex business logic with parameter transformation using dispatch table pattern
- **Google**: Multi-service provider with unified authentication and service modules using dispatch table pattern
  - Service modules: `gmail.ts`, `calendar.ts`
  - OAuth implementation using Google's SDK
  - Comprehensive scope mapping generated from capabilities

Each provider demonstrates the dispatch table pattern and can serve as a template for similar integrations. The Google provider is the most complete example showcasing the service module pattern and full OAuth implementation with proper risk assessments.

## Quick-Win Provider Backlog

The following checklist tracks lightweight providers and starter capabilities that can be added rapidly. Check items off as they are completed.

### Node.js SDK Available

- [ ] Discord – `message.create`, `channel.list`, `reaction.add`
- [ ] Microsoft Teams – `chat.post`, `channels.list`, `events.list`
- [ ] Twilio SendGrid – `email.send`, `template.list`
- [ ] Notion – `page.create`, `database.query`, `block.append`
- [ ] Asana – `task.create`, `task.list`, `project.list`
- [ ] Linear – `issue.create`, `issue.search`
- [ ] Dropbox – `files.upload`, `files.list_folder`, `files.download`
- [ ] Box – `file.upload`, `folder.list`, `file.previewLink`
- [ ] Calendly – `event.list`, `eventType.list`, `invitation.create`
- [ ] Zoom – `meeting.create`, `meeting.list`, `recording.list`
- [ ] HubSpot – `crm.contacts.create`, `crm.contacts.list`, `crm.deal.create`
- [ ] Mailchimp – `campaign.create`, `campaign.send`, `list.members.add`
- [ ] Plaid – `transactions.sync`, `account.list`, `linkToken.create`
- [ ] Snyk – `projects.list`, `issues.list`, `test.trigger`
- [ ] PagerDuty – `incident.create`, `incident.list`, `schedule.list`
- [ ] Google Classroom – `coursework.create`, `coursework.list`, `students.list`
- [ ] Brightspace (D2L) – `content.list`, `grade.update`, `user.enroll`
- [ ] Shippo – `shipment.create`, `label.create`, `tracking.get`
- [ ] EasyPost – `shipment.create`, `rate.list`, `tracker.create`
- [ ] ShipStation – `order.list`, `label.create`, `store.list`
- [ ] Shopify – `product.create`, `order.list`, `fulfillment.create`
- [ ] BigCommerce – `catalog.product.list`, `order.list`, `cart.create`
- [ ] Greenhouse – `candidate.create`, `job.list`, `application.list`
- [ ] Lever – `opportunity.create`, `candidate.search`, `posting.list`
- [ ] Epic FHIR – `patient.search`, `appointment.list`, `observation.create`
- [ ] Redox – `patient.search`, `visit.create`, `labresult.list`
- [ ] Amadeus – `flight.offers.search`, `hotel.search`, `booking.create`
- [ ] Sabre Dev Studio – `trip.flight.availability`, `hotel.availability`, `booking.create`
- [ ] Square for Restaurants – `menu.list`, `order.create`, `shift.list`

### REST-Only / No Official Node SDK Yet

- [ ] Zillow Bridge API – `property.search`, `lead.create`, `listing.list`
- [ ] AppFolio – `unit.list`, `tenant.create`, `maintenance.create`
- [ ] John Deere Operations Center – `field.list`, `machine.telemetry.list`, `job.create`
- [ ] Canvas LMS – `course.list`, `assignment.create`, `submission.list`


### links

- https://www.dropbox.com/developers/apps