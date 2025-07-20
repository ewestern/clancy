import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { Client } from "@microsoft/microsoft-graph-client";

// ---------------------------------------------------------------------------
// API Helper Function
// ---------------------------------------------------------------------------
function createGraphClient(ctx: ExecutionContext) {
  if (!ctx?.tokenPayload) throw new Error("Microsoft token missing");

  // For client-credentials flow, extract access_token from tokenPayload
  const accessToken = ctx.tokenPayload.access_token as string;
  if (!accessToken)
    throw new Error("Microsoft access token missing from token payload");

  // Create a custom auth provider that returns the token
  const authProvider = {
    getAccessToken: async () => accessToken,
  };

  return Client.initWithMiddleware({
    authProvider,
  });
}

// ---------------------------------------------------------------------------
// Users List Capability Schemas
// ---------------------------------------------------------------------------
export const usersListParamsSchema = Type.Object({
  search: Type.Optional(
    Type.String({
      description: "Search query (displayName, mail, userPrincipalName)",
    }),
  ),
  filter: Type.Optional(
    Type.String({
      description:
        "OData filter expression (e.g., \"startswith(displayName,'John')\")",
    }),
  ),
  orderBy: Type.Optional(
    Type.String({
      description: "Order by field (e.g., 'displayName asc')",
      default: "displayName asc",
    }),
  ),
  select: Type.Optional(
    Type.Array(Type.String(), {
      description: "Specific properties to return",
      default: [
        "id",
        "displayName",
        "mail",
        "userPrincipalName",
        "jobTitle",
        "department",
      ],
    }),
  ),
  top: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 999,
      description: "Maximum number of users to return",
      default: 50,
    }),
  ),
  skip: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "Number of users to skip for pagination",
      default: 0,
    }),
  ),
  consistencyLevel: Type.Optional(
    Type.Union([Type.Literal("eventual")], {
      description:
        "Use 'eventual' for advanced queries with $count, $search, or $filter",
    }),
  ),
  count: Type.Optional(
    Type.Boolean({
      description: "Include count of total results",
      default: false,
    }),
  ),
});

export const usersListResultSchema = Type.Object({
  value: Type.Array(
    Type.Object({
      id: Type.String({ description: "User ID" }),
      displayName: Type.Optional(
        Type.String({ description: "User's display name" }),
      ),
      mail: Type.Optional(
        Type.String({ description: "User's primary email address" }),
      ),
      userPrincipalName: Type.String({ description: "User's principal name" }),
      jobTitle: Type.Optional(Type.String({ description: "User's job title" })),
      department: Type.Optional(
        Type.String({ description: "User's department" }),
      ),
      officeLocation: Type.Optional(
        Type.String({ description: "User's office location" }),
      ),
      businessPhones: Type.Optional(
        Type.Array(Type.String(), {
          description: "User's business phone numbers",
        }),
      ),
      mobilePhone: Type.Optional(
        Type.String({ description: "User's mobile phone number" }),
      ),
      preferredLanguage: Type.Optional(
        Type.String({ description: "User's preferred language" }),
      ),
      accountEnabled: Type.Optional(
        Type.Boolean({ description: "Whether the account is enabled" }),
      ),
      createdDateTime: Type.Optional(
        Type.String({
          format: "date-time",
          description: "When the user was created",
        }),
      ),
      lastSignInDateTime: Type.Optional(
        Type.String({ format: "date-time", description: "Last sign-in time" }),
      ),
    }),
  ),
  "@odata.nextLink": Type.Optional(
    Type.String({ description: "URL for next page of results" }),
  ),
  "@odata.count": Type.Optional(
    Type.Number({ description: "Total count if requested" }),
  ),
});

// ---------------------------------------------------------------------------
// User Profile Get Capability Schemas
// ---------------------------------------------------------------------------
export const userProfileGetParamsSchema = Type.Object({
  userId: Type.Optional(
    Type.String({
      description:
        "User ID or userPrincipalName (defaults to current user 'me')",
      default: "me",
    }),
  ),
  select: Type.Optional(
    Type.Array(Type.String(), {
      description: "Specific properties to return",
      default: [
        "id",
        "displayName",
        "mail",
        "userPrincipalName",
        "jobTitle",
        "department",
        "manager",
      ],
    }),
  ),
  expand: Type.Optional(
    Type.Array(Type.String(), {
      description:
        "Related entities to expand (e.g., 'manager', 'directReports')",
    }),
  ),
});

export const userProfileGetResultSchema = Type.Object({
  id: Type.String({ description: "User ID" }),
  displayName: Type.Optional(
    Type.String({ description: "User's display name" }),
  ),
  mail: Type.Optional(
    Type.String({ description: "User's primary email address" }),
  ),
  userPrincipalName: Type.String({ description: "User's principal name" }),
  jobTitle: Type.Optional(Type.String({ description: "User's job title" })),
  department: Type.Optional(Type.String({ description: "User's department" })),
  officeLocation: Type.Optional(
    Type.String({ description: "User's office location" }),
  ),
  businessPhones: Type.Optional(Type.Array(Type.String())),
  mobilePhone: Type.Optional(
    Type.String({ description: "User's mobile phone number" }),
  ),
  preferredLanguage: Type.Optional(
    Type.String({ description: "User's preferred language" }),
  ),
  accountEnabled: Type.Optional(
    Type.Boolean({ description: "Whether the account is enabled" }),
  ),
  createdDateTime: Type.Optional(
    Type.String({
      format: "date-time",
      description: "When the user was created",
    }),
  ),
  lastSignInDateTime: Type.Optional(
    Type.String({ format: "date-time", description: "Last sign-in time" }),
  ),
  manager: Type.Optional(
    Type.Object(
      {
        id: Type.String(),
        displayName: Type.Optional(Type.String()),
        mail: Type.Optional(Type.String()),
        userPrincipalName: Type.String(),
      },
      { description: "User's manager (if expanded)" },
    ),
  ),
  directReports: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.String(),
        displayName: Type.Optional(Type.String()),
        mail: Type.Optional(Type.String()),
        userPrincipalName: Type.String(),
      }),
    ),
  ),
});

// ---------------------------------------------------------------------------
// Type definitions derived from schemas
// ---------------------------------------------------------------------------
export type UsersListParams = Static<typeof usersListParamsSchema>;
export type UsersListResult = Static<typeof usersListResultSchema>;
export type UserProfileGetParams = Static<typeof userProfileGetParamsSchema>;
export type UserProfileGetResult = Static<typeof userProfileGetResultSchema>;

// ---------------------------------------------------------------------------
// Capability implementations
// ---------------------------------------------------------------------------
export async function usersList(
  params: UsersListParams,
  ctx: ExecutionContext,
): Promise<UsersListResult> {
  const client = createGraphClient(ctx);

  try {
    let query = client.api("/users");

    // Apply query parameters
    if (params.search) {
      query = query.search(`"${params.search}"`);
    }

    if (params.filter) {
      query = query.filter(params.filter);
    }

    if (params.orderBy) {
      query = query.orderby(params.orderBy);
    }

    if (params.select && params.select.length > 0) {
      query = query.select(params.select.join(","));
    }

    if (params.top) {
      query = query.top(params.top);
    }

    if (params.skip) {
      query = query.skip(params.skip);
    }

    if (params.count) {
      query = query.count(true);
    }

    // Add consistency level header for advanced queries
    if (params.consistencyLevel || params.search || params.count) {
      query = query.header("ConsistencyLevel", "eventual");
    }

    const response = await query.get();

    return {
      value: response.value || [],
      "@odata.nextLink": response["@odata.nextLink"],
      "@odata.count": response["@odata.count"],
    };
  } catch (error: any) {
    // Handle rate limiting
    if (error.status === 429 || error.code === 429) {
      const retryAfter = error.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Microsoft Graph users list error: ${error.message}`);
  }
}

export async function userProfileGet(
  params: UserProfileGetParams,
  ctx: ExecutionContext,
): Promise<UserProfileGetResult> {
  const client = createGraphClient(ctx);

  try {
    const userId = params.userId || "me";
    let query = client.api(`/users/${userId}`);

    if (params.select && params.select.length > 0) {
      query = query.select(params.select.join(","));
    }

    if (params.expand && params.expand.length > 0) {
      query = query.expand(params.expand.join(","));
    }

    const response = await query.get();

    return response;
  } catch (error: any) {
    // Handle rate limiting
    if (error.status === 429 || error.code === 429) {
      const retryAfter = error.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Microsoft Graph user profile error: ${error.message}`);
  }
}
