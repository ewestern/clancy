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
// Calendar Event Create Capability Schemas
// ---------------------------------------------------------------------------
export const calendarEventCreateParamsSchema = Type.Object({
  subject: Type.String({ description: "Event title/subject" }),
  body: Type.Optional(
    Type.Object({
      contentType: Type.Union([Type.Literal("text"), Type.Literal("html")], {
        default: "html",
      }),
      content: Type.String({ description: "Event description/body" }),
    }),
  ),
  start: Type.Object({
    dateTime: Type.String({
      format: "date-time",
      description: "Start time in ISO 8601 format (e.g., 2024-01-15T09:00:00)",
    }),
    timeZone: Type.Optional(
      Type.String({
        description: "Timezone (e.g., 'Pacific Standard Time', 'UTC')",
        default: "UTC",
      }),
    ),
  }),
  end: Type.Object({
    dateTime: Type.String({
      format: "date-time",
      description: "End time in ISO 8601 format",
    }),
    timeZone: Type.Optional(
      Type.String({
        description: "Timezone (e.g., 'Pacific Standard Time', 'UTC')",
        default: "UTC",
      }),
    ),
  }),
  attendees: Type.Optional(
    Type.Array(
      Type.Object({
        emailAddress: Type.Object({
          address: Type.String({
            format: "email",
            description: "Attendee email address",
          }),
          name: Type.Optional(
            Type.String({ description: "Attendee display name" }),
          ),
        }),
        type: Type.Optional(
          Type.Union(
            [
              Type.Literal("required"),
              Type.Literal("optional"),
              Type.Literal("resource"),
            ],
            {
              description: "Attendee type",
              default: "required",
            },
          ),
        ),
      }),
      { description: "List of event attendees" },
    ),
  ),
  location: Type.Optional(
    Type.Object({
      displayName: Type.String({ description: "Location name or address" }),
      address: Type.Optional(
        Type.Object({
          street: Type.Optional(Type.String()),
          city: Type.Optional(Type.String()),
          state: Type.Optional(Type.String()),
          countryOrRegion: Type.Optional(Type.String()),
          postalCode: Type.Optional(Type.String()),
        }),
      ),
    }),
  ),
  isOnlineMeeting: Type.Optional(
    Type.Boolean({
      description: "Whether to create a Teams meeting",
      default: false,
    }),
  ),
  onlineMeetingProvider: Type.Optional(
    Type.Union(
      [Type.Literal("teamsForBusiness"), Type.Literal("skypeForBusiness")],
      {
        description: "Online meeting provider",
        default: "teamsForBusiness",
      },
    ),
  ),
  importance: Type.Optional(
    Type.Union(
      [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
      {
        default: "normal",
      },
    ),
  ),
  showAs: Type.Optional(
    Type.Union(
      [
        Type.Literal("free"),
        Type.Literal("tentative"),
        Type.Literal("busy"),
        Type.Literal("oof"),
        Type.Literal("workingElsewhere"),
      ],
      {
        description: "Show as status for the event",
        default: "busy",
      },
    ),
  ),
  isReminderOn: Type.Optional(
    Type.Boolean({
      description: "Whether to set a reminder",
      default: true,
    }),
  ),
  reminderMinutesBeforeStart: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "Minutes before start to remind",
      default: 15,
    }),
  ),
  calendarId: Type.Optional(
    Type.String({
      description:
        "Calendar ID to create event in (defaults to primary calendar)",
    }),
  ),
  userPrincipalName: Type.Optional(
    Type.String({
      format: "email",
      description:
        "User's calendar to create event in (for app-only scenarios)",
    }),
  ),
});

export const calendarEventCreateResultSchema = Type.Object({
  id: Type.String({ description: "Event ID" }),
  subject: Type.String({ description: "Event subject" }),
  start: Type.Object({
    dateTime: Type.String({ format: "date-time" }),
    timeZone: Type.String(),
  }),
  end: Type.Object({
    dateTime: Type.String({ format: "date-time" }),
    timeZone: Type.String(),
  }),
  webLink: Type.String({ description: "Web link to the event" }),
  onlineMeeting: Type.Optional(
    Type.Object({
      joinUrl: Type.Optional(
        Type.String({ description: "Teams meeting join URL" }),
      ),
      conferenceId: Type.Optional(Type.String()),
    }),
  ),
  createdDateTime: Type.String({ format: "date-time" }),
  lastModifiedDateTime: Type.String({ format: "date-time" }),
});

// ---------------------------------------------------------------------------
// Calendar Events List Capability Schemas
// ---------------------------------------------------------------------------
export const calendarEventsListParamsSchema = Type.Object({
  startTime: Type.Optional(
    Type.String({
      format: "date-time",
      description: "Start of time range to query (ISO 8601 format)",
    }),
  ),
  endTime: Type.Optional(
    Type.String({
      format: "date-time",
      description: "End of time range to query (ISO 8601 format)",
    }),
  ),
  filter: Type.Optional(
    Type.String({
      description:
        "OData filter expression (e.g., \"subject eq 'Team Meeting'\")",
    }),
  ),
  orderBy: Type.Optional(
    Type.String({
      description: "Order by field (e.g., 'start/dateTime asc')",
      default: "start/dateTime asc",
    }),
  ),
  select: Type.Optional(
    Type.Array(Type.String(), {
      description: "Specific properties to return",
      default: [
        "id",
        "subject",
        "start",
        "end",
        "location",
        "attendees",
        "webLink",
      ],
    }),
  ),
  top: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 1000,
      description: "Maximum number of events to return",
      default: 50,
    }),
  ),
  skip: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "Number of events to skip for pagination",
      default: 0,
    }),
  ),
  calendarId: Type.Optional(
    Type.String({
      description: "Calendar ID to query (defaults to primary calendar)",
    }),
  ),
  userPrincipalName: Type.Optional(
    Type.String({
      format: "email",
      description: "User's calendar to query (for app-only scenarios)",
    }),
  ),
});

export const calendarEventsListResultSchema = Type.Object({
  value: Type.Array(
    Type.Object({
      id: Type.String({ description: "Event ID" }),
      subject: Type.Optional(Type.String({ description: "Event subject" })),
      start: Type.Object({
        dateTime: Type.String({ format: "date-time" }),
        timeZone: Type.String(),
      }),
      end: Type.Object({
        dateTime: Type.String({ format: "date-time" }),
        timeZone: Type.String(),
      }),
      location: Type.Optional(
        Type.Object({
          displayName: Type.Optional(Type.String()),
          address: Type.Optional(
            Type.Object({
              street: Type.Optional(Type.String()),
              city: Type.Optional(Type.String()),
              state: Type.Optional(Type.String()),
              countryOrRegion: Type.Optional(Type.String()),
              postalCode: Type.Optional(Type.String()),
            }),
          ),
        }),
      ),
      attendees: Type.Optional(
        Type.Array(
          Type.Object({
            emailAddress: Type.Object({
              address: Type.String(),
              name: Type.Optional(Type.String()),
            }),
            status: Type.Optional(
              Type.Object({
                response: Type.Union([
                  Type.Literal("none"),
                  Type.Literal("organizer"),
                  Type.Literal("tentativelyAccepted"),
                  Type.Literal("accepted"),
                  Type.Literal("declined"),
                  Type.Literal("notResponded"),
                ]),
                time: Type.Optional(Type.String({ format: "date-time" })),
              }),
            ),
            type: Type.Union([
              Type.Literal("required"),
              Type.Literal("optional"),
              Type.Literal("resource"),
            ]),
          }),
        ),
      ),
      organizer: Type.Optional(
        Type.Object({
          emailAddress: Type.Object({
            address: Type.String(),
            name: Type.Optional(Type.String()),
          }),
        }),
      ),
      isOnlineMeeting: Type.Boolean(),
      onlineMeeting: Type.Optional(
        Type.Object({
          joinUrl: Type.Optional(Type.String()),
        }),
      ),
      importance: Type.Union([
        Type.Literal("low"),
        Type.Literal("normal"),
        Type.Literal("high"),
      ]),
      showAs: Type.Union([
        Type.Literal("free"),
        Type.Literal("tentative"),
        Type.Literal("busy"),
        Type.Literal("oof"),
        Type.Literal("workingElsewhere"),
      ]),
      webLink: Type.String(),
      createdDateTime: Type.String({ format: "date-time" }),
      lastModifiedDateTime: Type.String({ format: "date-time" }),
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
// Type definitions derived from schemas
// ---------------------------------------------------------------------------
export type CalendarEventCreateParams = Static<
  typeof calendarEventCreateParamsSchema
>;
export type CalendarEventCreateResult = Static<
  typeof calendarEventCreateResultSchema
>;
export type CalendarEventsListParams = Static<
  typeof calendarEventsListParamsSchema
>;
export type CalendarEventsListResult = Static<
  typeof calendarEventsListResultSchema
>;

// ---------------------------------------------------------------------------
// Capability implementations
// ---------------------------------------------------------------------------
export async function calendarEventCreate(
  params: CalendarEventCreateParams,
  ctx: ExecutionContext,
): Promise<CalendarEventCreateResult> {
  const client = createGraphClient(ctx);

  try {
    const event = {
      subject: params.subject,
      body: params.body,
      start: {
        dateTime: params.start.dateTime,
        timeZone: params.start.timeZone || "UTC",
      },
      end: {
        dateTime: params.end.dateTime,
        timeZone: params.end.timeZone || "UTC",
      },
      attendees: params.attendees?.map((attendee) => ({
        emailAddress: attendee.emailAddress,
        type: attendee.type || "required",
      })),
      location: params.location,
      isOnlineMeeting: params.isOnlineMeeting || false,
      onlineMeetingProvider: params.onlineMeetingProvider || "teamsForBusiness",
      importance: params.importance || "normal",
      showAs: params.showAs || "busy",
      isReminderOn: params.isReminderOn !== false,
      reminderMinutesBeforeStart: params.reminderMinutesBeforeStart || 15,
    };

    // Determine the endpoint based on parameters
    let endpoint: string;
    if (params.userPrincipalName) {
      endpoint = params.calendarId
        ? `/users/${params.userPrincipalName}/calendars/${params.calendarId}/events`
        : `/users/${params.userPrincipalName}/calendar/events`;
    } else {
      endpoint = params.calendarId
        ? `/me/calendars/${params.calendarId}/events`
        : "/me/calendar/events";
    }

    const response = await client.api(endpoint).post(event);

    return {
      id: response.id,
      subject: response.subject,
      start: response.start,
      end: response.end,
      webLink: response.webLink,
      onlineMeeting: response.onlineMeeting
        ? {
            joinUrl: response.onlineMeeting.joinUrl,
            conferenceId: response.onlineMeeting.conferenceId,
          }
        : undefined,
      createdDateTime: response.createdDateTime,
      lastModifiedDateTime: response.lastModifiedDateTime,
    };
  } catch (error: any) {
    // Handle rate limiting
    if (error.status === 429 || error.code === 429) {
      const retryAfter = error.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Microsoft Graph calendar create error: ${error.message}`);
  }
}

export async function calendarEventsList(
  params: CalendarEventsListParams,
  ctx: ExecutionContext,
): Promise<CalendarEventsListResult> {
  const client = createGraphClient(ctx);

  try {
    // Determine the endpoint based on parameters
    let endpoint: string;
    if (params.userPrincipalName) {
      endpoint = params.calendarId
        ? `/users/${params.userPrincipalName}/calendars/${params.calendarId}/events`
        : `/users/${params.userPrincipalName}/calendar/events`;
    } else {
      endpoint = params.calendarId
        ? `/me/calendars/${params.calendarId}/events`
        : "/me/calendar/events";
    }

    let query = client.api(endpoint);

    // Apply query parameters
    if (params.startTime && params.endTime) {
      const timeFilter = `start/dateTime ge '${params.startTime}' and end/dateTime le '${params.endTime}'`;
      query = query.filter(
        params.filter ? `(${params.filter}) and (${timeFilter})` : timeFilter,
      );
    } else if (params.filter) {
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
    throw new Error(`Microsoft Graph calendar list error: ${error.message}`);
  }
}
