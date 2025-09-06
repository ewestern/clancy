# Adding Providers to ConnectHub

This guide provides comprehensive instructions for adding new providers and capabilities to the ConnectHub integration layer. Follow these patterns and conventions to ensure consistency and maintainability.

## Overview

ConnectHub uses a provider-based architecture where each external service (Slack, QuickBooks, Google) is implemented as a `ProviderRuntime` with multiple capabilities. Each capability represents a specific action that can be performed via the provider's API.

All providers extend the `BaseProvider` abstract class, which automatically handles dispatch table management, scope mapping generation, and common `ProviderRuntime` methods.

## Provider Architecture

### Core Components

1. **BaseProvider**: Abstract base class that handles common ProviderRuntime functionality
2. **Provider Classes**: Concrete provider implementations extending BaseProvider
3. **Capabilities**: Individual actions/operations the provider can perform
4. **Capability Factories**: Functions that create capability instances with metadata
5. **Schemas**: TypeBox schemas for parameter validation and type safety
6. **Documentation URLs**: Specific API endpoint documentation links
7. **Risk Assessment**: Risk level classification for each capability
8. **Ownership Scope**: Token ownership classification (user vs organization)
9. **OAuth Methods**: Token management and scope validation (for external providers)
10. **Service Modules**: Separate files for different services within a provider

### Webhook and Trigger System (optional)

If your provider exposes inbound webhooks (e.g. Slack Events API), implement them using the `Webhook<S, E>` and `ProviderRuntime<S, E>` types. The webhook system includes a trigger mechanism for event-driven agent workflows.

**Key Components:**

- **Webhook Event Schemas**: TypeBox schemas defining incoming event structure
- **Triggers**: Definitions that describe params, required scopes, how to detect relevant events, how to fetch registrations, and how to create agent events
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
   - Create trigger definitions with the following shape (see reference below)
   - Implement `eventSatisfies` to cheaply filter irrelevant webhook events
   - Implement `getTriggerRegistrations` to query matching registrations for the event
   - Implement `createEvents` to transform webhook events into standardized run-intent events
   - Optionally implement `renderTriggerDefinition` to display a human-readable summary
   - Optionally implement `registerSubscription` for providers that require remote subscriptions (e.g. Google watch APIs)

4. **Register Webhooks with Triggers**
   - Associate triggers with webhook endpoints
   - Expose through provider's `webhooks` property

5. **Provider Implementation**
   - Use generic types: `ProviderRuntime<WebhookSchema, EventType>`
   - Expose webhooks via `webhooks` property
   - Expose triggers via `triggers` property

### Trigger and Webhook Interfaces (current)

The trigger and webhook interfaces define how incoming events are validated, matched to registrations, and converted into agent run-intent events.

```typescript
// Trigger<E> (from connect_hub/src/providers/types.ts)
export interface Trigger<E = unknown> {
  id: string;
  requiredScopes?: string[];

  // Defines the event payload delivered to agents on RunIntent
  eventDetailsSchema: TSchema;

  // Parameters accepted when registering this trigger
  paramsSchema: TSchema;

  // Optional: parameters/options discovery for UI flows
  optionsRequestSchema?: TSchema;
  resolveTriggerParams?: (
    db: Database,
    orgId: string,
    userId: string,
  ) => Promise<Record<string, unknown[]>>;

  // Query DB for matching registrations for this incoming event
  getTriggerRegistrations: (
    db: Database,
    triggerId: string,
    event: E,
    headers: Record<string, any>,
  ) => Promise<TriggerRegistration[]>;

  // Optional: create/refresh provider subscriptions and return metadata
  registerSubscription?: (
    db: Database,
    connectionMetadata: Record<string, unknown>,
    triggerRegistration: typeof triggerRegistrations.$inferSelect,
    oauthContext: OAuthContext,
  ) => Promise<{
    expiresAt: Date;
    subscriptionMetadata: Record<string, unknown>;
  }>;

  // Create standardized events for the agent runtime
  createEvents: (
    event: E,
    headers: Record<string, any>,
    triggerRegistration: TriggerRegistration,
  ) => Promise<{
    event: RunIntentEvent;
    partitionKey: string;
  }[]>;

  // Human-readable description of a specific registration
  renderTriggerDefinition: (
    trigger: Trigger<E>,
    triggerRegistration: typeof triggerRegistrations.$inferSelect,
  ) => string;

  description: string;
  displayName: string;

  // Cheap pre-filter for webhook events
  eventSatisfies: (event: E, headers: Record<string, any>) => boolean;
}

// Webhook<S, E>
export interface Webhook<S extends FastifySchema = FastifySchema, E = unknown> {
  eventSchema: S; // Fastify route schema for the webhook endpoint
  validateRequest: (request: FastifyRequestTypeBox<S>) => Promise<boolean>;
  replyHook?: (
    request: FastifyRequestTypeBox<S>,
    reply: FastifyReplyTypeBox<S>,
  ) => Promise<void>;
  triggers: Trigger<E>[];
}
```

#### Webhook Processing Flow

The runtime processes incoming webhook requests as follows:

- Validate the request via `validateRequest(request)`; reject on failure
- For each `trigger` on the webhook:
  - Call `eventSatisfies(event, headers)` to cheaply pre-filter
  - Call `getTriggerRegistrations(db, trigger.id, event, headers)`
  - For each registration, call `createEvents(event, headers, registration)`
  - Publish all returned RunIntent events, using each item’s `partitionKey`
- If a `replyHook` is defined, call it to shape the HTTP response; otherwise return `{ status: "ok" }`

#### Optional Trigger Capabilities

- **`requiredScopes`**: Minimal provider scopes required to register/use this trigger
- **`resolveTriggerParams` + `optionsRequestSchema`**: Dynamically provide selectable options for registration params (used by UI flows)
- **`registerSubscription`**: Create/refresh provider-side subscriptions and persist returned `subscriptionMetadata`/`expiresAt`

#### Example: Slack `message.created` Trigger (simplified)

```typescript
export const slackMessageCreated: Trigger<WebhookEvent> = {
  id: "message.created",
  displayName: "Message Created",
  description: "A message was created",
  paramsSchema: messageCreatedParamsSchema,
  eventDetailsSchema: WebhookEventSchema,

  eventSatisfies: (event) => event.type !== "url_verification" && event.event.type === "message",

  async getTriggerRegistrations(db, triggerId, event) {
    // Match on Slack team id stored in connection.externalAccountMetadata
    // Return TriggerRegistration[] with ISO string timestamps as needed
  },

  async createEvents(event, headers, registration) {
    return [{
      event: {
        type: EventType.RunIntent,
        timestamp: new Date().toISOString(),
        orgId: registration.orgId,
        agentId: registration.agentId,
        executionId: `exec-slack.message-${Date.now()}`,
        userId: registration.connection?.userId!,
        details: event.event,
      },
      partitionKey: registration.id!,
    }];
  },
};
```

**Trigger Registration Pattern:**

- Query database for trigger registrations matching event context
- Filter by provider, external account, and trigger-specific criteria
- Return transformed trigger registration objects for agent consumption

**Event Transformation:**

- Convert provider webhook events into standardized agent event format
- Always return an array of `{ event: RunIntentEvent, partitionKey: string }`
- Include partition keys for proper event ordering and processing
- Maintain correlation between webhook events and agent executions

### BaseProvider

All providers extend `BaseProvider` which automatically handles:

- Dispatch table management from capability factories
- Scope mapping generation
- Standard `ProviderRuntime` method implementations
- Trigger and webhook registration
- Type-safe implementation without `any` types

### File Structure

```
connect_hub/src/
├── providers/
│   ├── base.ts                     # BaseProvider abstract class
│   └── types.ts                    # Provider type definitions
└── integrations/
    ├── {provider-name}.ts          # Main provider implementation
    └── {provider-name}/
        ├── {service-name}.ts       # Service-specific implementations
        ├── {service-name}.ts       # Additional services (e.g., gmail.ts, calendar.ts)
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

Create `connect_hub/src/integrations/{provider-name}.ts` using the new `BaseProvider` pattern:

```typescript
import {
  Capability,
  CapabilityMeta,
  CapabilityFactory,
  CapabilityRisk,
  OAuthAuthUrlParams,
  OAuthCallbackParams,
  OAuthContext,
  CallbackResult,
} from "../providers/types.js";
import { BaseProvider } from "../providers/base.js";
import { ProviderKind, ProviderAuth } from "../models/providers.js";
import { OwnershipScope } from "../models/shared.js";

// Import service modules
import {
  {service}{capability},
  {service}{capability}ParamsSchema,
  {service}{capability}ResultSchema,
} from "./{provider-name}/{service-name}.js";

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
    ownershipScope: OwnershipScope.User, // or OwnershipScope.Organization
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

// For providers with webhooks, use: extends BaseProvider<WebhookSchema, EventType>
export class {Provider}Provider extends BaseProvider {
  constructor() {
    super({
      metadata: {
        id: "{provider-id}",
        displayName: "{Provider Display Name}",
        description: "Description of what this provider does",
        icon: "https://example.com/icon.png",
        docsUrl: "https://developer.{provider}.com/docs",
        kind: ProviderKind.External,
        auth: ProviderAuth.OAuth2, // or OAuth1, ApiKey, etc.
      },
      capabilityFactories: {
        "{service}.{capability}": create{Service}{Capability}Capability,
        // Add more capabilities...
      },
      // Optional: External management links (e.g. provider app configuration)
      links: [
        "https://developer.{provider}.com/apps/your-app-id/settings"
      ],
      // Optional: Webhook support (add if provider supports webhooks)
      webhooks,
      // Optional: Trigger support (add if provider supports triggers)
      triggers,
    });
  }

  // OAuth methods implementation (only provider-specific methods needed)
  generateAuthUrl(params: OAuthAuthUrlParams, ctx: OAuthContext): string {
    // Implement OAuth authorization URL generation
  }

  async handleCallback(
    params: OAuthCallbackParams,
    ctx: OAuthContext,
  ): Promise<CallbackResult> {
    // Implement OAuth callback handling
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
    // Implement token validation
  }

  // Optional: Refresh token implementation
  async refreshToken(
    tokenPayload: Record<string, unknown>,
    ctx: OAuthContext,
  ): Promise<Record<string, unknown>> {
    // Implement token refresh logic
  }
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
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send",
    paramsSchema: gmailSendParamsSchema,
    resultSchema: gmailSendResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    ownershipScope: OwnershipScope.User, // Personal mailbox access
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
    ownershipScope: OwnershipScope.Organization, // Team workspace access
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
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list",
    paramsSchema: gmailSearchParamsSchema,
    resultSchema: gmailSearchResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    ownershipScope: OwnershipScope.User, // Personal mailbox access
    risk: CapabilityRisk.LOW, // Read-only operation
  };
  return { meta, execute: gmailSearch };
}
```

### 4. Ownership Scope Classification

Each capability must specify an `ownershipScope` that determines whether the capability operates on behalf of a specific user or the entire organization. This classification affects how tokens are stored, retrieved, and matched during capability execution.

#### Ownership Scope Types

- **`OwnershipScope.User`**: Capabilities that operate on behalf of a specific user
  - Personal email access (Gmail, Outlook mailboxes)
  - Personal calendar access (individual calendars)
  - Personal file access (user's Drive files)
  - User profile access
  - _Token Storage_: Scoped to the specific Auth0 user ID who authorized the connection

- **`OwnershipScope.Organization`**: Capabilities that operate on behalf of the organization
  - Team communication (Slack channels, team file sharing)
  - Business operations (QuickBooks accounting, company documents)
  - Administrative functions (user directories, team management)
  - Shared resources (organization Drive, team calendars)
  - Internal services (Clancy email service, knowledge base)
  - _Token Storage_: Scoped to the Auth0 organization ID

#### Ownership Scope Guidelines

**Choose User Scope When:**

- The capability accesses personal, user-specific data
- The API operation is performed "as" a specific user
- Different users in the same org would have different access/data
- Examples: Reading someone's inbox, accessing personal calendar, personal file uploads

**Choose Organization Scope When:**

- The capability accesses shared, company-wide resources
- The API operation is performed on behalf of the organization
- All authorized users in the org would access the same data/resources
- Service accounts or admin-level access is required
- Examples: Company accounting data, team channels, shared drives, user directories

#### Ownership Scope Implementation

```typescript
import { OwnershipScope } from "../models/shared.js";

// USER SCOPE EXAMPLE: Personal email access
function createGmailSendCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "gmail.messages.send",
    displayName: "Send Email",
    description: "Send an email via Gmail",
    docsUrl:
      "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send",
    paramsSchema: gmailSendParamsSchema,
    resultSchema: gmailSendResultSchema,
    requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
    ownershipScope: OwnershipScope.User, // Personal mailbox access
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: gmailSend };
}

// ORGANIZATION SCOPE EXAMPLE: Team communication
function createSlackChatPostCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "chat.post",
    displayName: "Post Message",
    description: "Send a message to a Slack channel",
    docsUrl: "https://api.slack.com/methods/chat.postMessage",
    paramsSchema: chatPostParamsSchema,
    resultSchema: chatPostResultSchema,
    requiredScopes: ["chat:write"],
    ownershipScope: OwnershipScope.Organization, // Team workspace access
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: slackChatPost };
}

// ORGANIZATION SCOPE EXAMPLE: Business operations
function createQuickBooksInvoiceCreateCapability(): Capability {
  const meta: CapabilityMeta = {
    id: "invoice.create",
    displayName: "Create Invoice",
    description: "Create and email an invoice to a customer",
    docsUrl:
      "https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice#create-an-invoice",
    paramsSchema: invoiceCreateParamsSchema,
    resultSchema: invoiceCreateResultSchema,
    requiredScopes: ["com.intuit.quickbooks.accounting"],
    ownershipScope: OwnershipScope.Organization, // Company accounting data
    risk: CapabilityRisk.HIGH,
  };
  return { meta, execute: qbInvoiceCreate };
}
```

#### Mixed Provider Examples

**Google Workspace Provider:**

- Gmail capabilities: `OwnershipScope.User` (personal mailbox)
- Calendar capabilities: `OwnershipScope.User` (personal calendar)
- Drive capabilities: `OwnershipScope.Organization` (shared drives, org documents)

**Microsoft 365 Provider:**

- Mail capabilities: `OwnershipScope.User` (personal mailbox)
- Calendar capabilities: `OwnershipScope.User` (personal calendar)
- Users.list capability: `OwnershipScope.Organization` (admin directory access)

#### Token Matching Logic

The ownership scope determines how tokens are matched during capability execution:

1. **User-scoped capabilities** require tokens stored with:
   - `ownershipScope: "user"`
   - `ownerId: auth0_user_id` (of the user who authorized)

2. **Organization-scoped capabilities** require tokens stored with:
   - `ownershipScope: "organization"`
   - `ownerId: auth0_org_id` (of the organization)

3. **Runtime validation** in the proxy route:
   - Checks capability's required `ownershipScope`
   - Queries for tokens matching provider + scope + owner
   - Validates token has required OAuth scopes
   - Executes capability with matched token

#### Provider-Specific Scope Information

Many OAuth providers include metadata in their token responses or account information that can help determine the appropriate ownership scope. This information should be extracted during the OAuth callback and used to inform scope decisions.

##### Key Provider Indicators

**Google Workspace:**

- **Hosted Domain (`hd` field)**: Present when user belongs to a Google Workspace organization
- **Account Type**: Workspace accounts typically indicate organization-level access intent
- **OAuth Scopes**: Broad scopes like `auth/drive` vs narrow scopes like `auth/drive.file` suggest different access patterns

**Microsoft 365:**

- **Tenant ID**: Azure AD tenant indicates business context
- **User Profile**: Job title, company name, and business email domains suggest organizational accounts
- **Graph API Context**: Organization vs personal OneDrive access patterns

**Slack:**

- **Team/Workspace ID**: All Slack OAuth tokens are inherently team-scoped
- **Enterprise Grid**: Enterprise context for large organizations
- **Bot vs User Tokens**: Different permission models but both organization-scoped

**QuickBooks:**

- **Company/Realm ID**: Always indicates business/organization context
- **Subscription Type**: Business subscription levels affect available features

##### Using Provider Metadata for Scope Decisions

The key insight is to extract this information during OAuth callback and use it to make intelligent scope decisions:

1. **Dynamic Scope Assignment**: Instead of hardcoding ownership scope, determine it based on the actual account type and context returned by the provider

2. **Scope Validation**: Validate that the granted OAuth scopes align with the intended ownership scope (e.g., admin scopes suggest organization access)

3. **Account Context Awareness**: Use provider signals like domain membership, tenant affiliation, or subscription type to inform scope decisions

```typescript
// Key pattern: Extract provider context to inform scope decisions
async function updateOrCreateConnection(/* params */) {
  // Determine ownership scope based on provider metadata
  let ownershipScope: OwnershipScope;
  let ownerId: string;

  if (providerId === "google") {
    // Use Google's hosted domain info
    const isWorkspace = externalAccountMetadata.isWorkspaceAccount;
    ownershipScope = isWorkspace
      ? OwnershipScope.Organization
      : OwnershipScope.User;
    ownerId = isWorkspace ? orgId : userId!;
  } else if (providerId === "slack") {
    // Slack is always team-scoped
    ownershipScope = OwnershipScope.Organization;
    ownerId = orgId;
  }
  // ... handle other providers
}
```

##### OAuth Flow Enhancements

**Pre-Authorization Hints**: Some providers allow you to hint at the desired access scope during authorization URL generation. For example, Google's `hd` parameter can restrict authorization to a specific domain.

**Runtime Scope Validation**: Implement additional validation in capability execution to ensure the token context matches the capability's requirements. This is especially important for mixed providers where the same capability might work differently for personal vs business accounts.

**Scope Analysis Patterns**: Analyze the granted OAuth scopes to infer access patterns. Broad administrative scopes often indicate organization-level access intent, while narrow user-specific scopes suggest personal access.

##### Implementation Strategy

1. **Enhanced OAuth Callback**: Extract and store comprehensive provider metadata during token exchange
2. **Intelligent Scope Assignment**: Use provider signals rather than simple user/org ID presence to determine ownership scope
3. **Capability-Level Validation**: Add runtime checks that validate token context against capability requirements
4. **Graceful Scope Mismatches**: Provide clear error messages and re-authorization flows when scope mismatches occur

This approach leverages the rich contextual information that OAuth providers expose, enabling more accurate and reliable ownership scope decisions while reducing the need for users to re-authorize when scope requirements change.

#### Ownership Scope Decision Tree

```
Does the capability access personal/user-specific data?
├─ YES: Does each user have different data/access?
│  ├─ YES: Use OwnershipScope.User
│  └─ NO: Consider organization scope
└─ NO: Does it access shared/company resources?
   ├─ YES: Use OwnershipScope.Organization
   └─ NO: Review the capability design
```

#### Common Ownership Scope Patterns

| Provider Type | Service             | Typical Scope  | Reasoning              |
| ------------- | ------------------- | -------------- | ---------------------- |
| Email         | Gmail, Outlook      | User           | Personal mailboxes     |
| Calendar      | Google Cal, Outlook | User           | Personal calendars     |
| File Storage  | Drive, OneDrive     | Organization\* | Shared company files   |
| Team Chat     | Slack, Teams        | Organization   | Team communications    |
| Accounting    | QuickBooks, Xero    | Organization   | Company financial data |
| CRM           | Salesforce, HubSpot | Organization   | Company customer data  |
| Education     | Canvas, Brightspace | Organization   | Institutional courses  |
| Internal      | Clancy services     | Organization   | Platform services      |

\*Note: File storage can be user-scoped for personal files, org-scoped for shared drives

#### Migration and Backwards Compatibility

When adding ownership scope to existing providers:

1. **Default Behavior**: Existing tokens without ownership scope default to user scope
2. **Gradual Migration**: Update capability definitions first, then migrate tokens
3. **Token Re-authorization**: Users may need to re-authorize for organization-scoped capabilities
4. **Clear Communication**: Inform users about scope changes and re-authorization requirements

### 5. Schema Design Patterns

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

### 6. API Helper Function Patterns

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

### 7. Capability Naming Conventions

#### Capability IDs

- Use dot notation: `{service}.{action}`
- Examples: `chat.post`, `invoice.create`, `gmail.send`, `calendar.event.create`
- Be specific and descriptive
- Use verbs for actions: `create`, `update`, `delete`, `list`, `send`

#### Function Names

- Combine provider + capability: `{provider}{Capability}`
- Examples: `slackChatPost`, `qbInvoiceCreate`, `gmailSend`
- Use PascalCase for capability part

### 8. Error Handling Patterns

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

### 9. OAuth Implementation Patterns

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
10. **❌ Don't add unimplemented capabilities**: Only include capability factories that are fully implemented

## Integration Checklist

### Core Implementation

- [ ] Provider class created extending BaseProvider
- [ ] Service modules created for multi-service providers
- [ ] All capabilities implemented with TypeBox schemas
- [ ] Capability factory functions created
- [ ] Risk levels assessed for all capabilities
- [ ] Ownership scopes assigned for all capabilities (User vs Organization)
- [ ] API helper function with rate limiting and error handling
- [ ] Capability metadata with documentation URLs
- [ ] Provider metadata configured in BaseProvider constructor
- [ ] External management links added (optional)
- [ ] Required scopes defined for each capability
- [ ] TypeBox Static pattern used throughout
- [ ] Error handling implemented
- [ ] Business logic validated

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
- [ ] Trigger unit tests for all createEvents methods (if applicable)
- [ ] OAuth flow integration tests
- [ ] Error scenario testing
- [ ] Scope mapping validation
- [ ] Documentation updated

## Testing Requirements

When implementing a new provider, you must create unit tests to ensure reliability and maintainability. The testing strategy is designed to avoid database dependencies while providing thorough coverage of provider functionality.

### Required Test Suites

#### Trigger Tests (Required for providers with triggers)

Create unit tests for all trigger `createEvents` methods in `tests/unit/triggers/{provider-name}.test.ts`:

- **Test Structure**: One test file per provider with triggers, organized by trigger type
- **Mock Strategy**: Use mock trigger registrations to avoid database interactions
- **Event Coverage**: Test valid events, invalid events, edge cases, and error conditions
- **Event Validation**: Verify generated events have correct structure, partition keys, and required fields
- **Provider Logic**: Test provider-specific event transformations and data handling
- **Realistic Scenarios**: Use actual webhook payloads and realistic event data in tests

#### Capability Tests (Future requirement)

Unit tests for provider capabilities will be added as a future requirement covering parameter validation, API response handling, and error scenarios.

#### Integration Tests (Future requirement)

End-to-end tests for OAuth flows and live API interactions will be added as a future requirement.

## Examples

Refer to existing providers for implementation examples:

- **Slack**: OAuth2 provider extending BaseProvider with webhook support and triggers for event-driven workflows
- **QuickBooks**: Business logic provider with parameter transformation
- **Google**: Multi-service provider with service modules (`gmail.ts`, `calendar.ts`) and Google SDK OAuth implementation

Each provider extends BaseProvider and demonstrates different patterns: webhooks, multi-service architecture, and OAuth implementations.

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
