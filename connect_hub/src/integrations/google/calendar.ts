import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { google } from "googleapis";

// ---------------------------------------------------------------------------
// Calendar API helper
// ---------------------------------------------------------------------------
function createCalendarClient(ctx: ExecutionContext) {
  if (!ctx?.tokenPayload) throw new Error("Google token missing");

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(ctx.tokenPayload as Record<string, unknown>);

  return google.calendar({ version: "v3", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// Calendar Schemas
// ---------------------------------------------------------------------------

export const calendarEventCreateParamsSchema = Type.Object({
  calendarId: Type.Optional(
    Type.String({ description: "Calendar identifier" }),
  ),
  summary: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  start: Type.Optional(
    Type.Object({
      dateTime: Type.Optional(Type.String()),
      date: Type.Optional(Type.String()),
      timeZone: Type.Optional(Type.String()),
    }),
  ),
  end: Type.Optional(
    Type.Object({
      dateTime: Type.Optional(Type.String()),
      date: Type.Optional(Type.String()),
      timeZone: Type.Optional(Type.String()),
    }),
  ),
  attendees: Type.Optional(
    Type.Array(
      Type.Object({
        email: Type.Optional(Type.String()),
        responseStatus: Type.Optional(Type.String()),
      }),
    ),
  ),
  sendNotifications: Type.Optional(
    Type.Boolean({
      description:
        "Whether to send notifications about the creation of the new event",
    }),
  ),
  sendUpdates: Type.Optional(
    Type.String({
      description:
        "Guests who should receive notifications about the creation of the new event",
    }),
  ),
});

export const calendarEventCreateResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  htmlLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  status: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  created: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  updated: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  summary: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const calendarEventsListParamsSchema = Type.Object({
  calendarId: Type.Optional(
    Type.String({ description: "Calendar identifier" }),
  ),
  timeMin: Type.Optional(
    Type.String({
      description:
        "Lower bound (exclusive) for an event's end time to filter by",
    }),
  ),
  timeMax: Type.Optional(
    Type.String({
      description:
        "Upper bound (exclusive) for an event's start time to filter by",
    }),
  ),
  maxResults: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 2500,
      description: "Maximum number of events returned on one result page",
    }),
  ),
  q: Type.Optional(
    Type.String({
      description:
        "Free text search terms to find events that match these terms",
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description: "Token specifying which result page to return",
    }),
  ),
  singleEvents: Type.Optional(
    Type.Boolean({
      description: "Whether to expand recurring events into instances",
    }),
  ),
  orderBy: Type.Optional(
    Type.String({
      description: "The order of the events returned in the result",
    }),
  ),
});

export const calendarEventsListResultSchema = Type.Object({
  items: Type.Optional(
    Type.Union([
      Type.Array(
        Type.Object({
          id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          summary: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          start: Type.Optional(
            Type.Union([
              Type.Object({
                dateTime: Type.Optional(
                  Type.Union([Type.String(), Type.Null()]),
                ),
                date: Type.Optional(Type.Union([Type.String(), Type.Null()])),
              }),
              Type.Null(),
            ]),
          ),
          end: Type.Optional(
            Type.Union([
              Type.Object({
                dateTime: Type.Optional(
                  Type.Union([Type.String(), Type.Null()]),
                ),
                date: Type.Optional(Type.Union([Type.String(), Type.Null()])),
              }),
              Type.Null(),
            ]),
          ),
        }),
      ),
      Type.Null(),
    ]),
  ),
  nextPageToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  nextSyncToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export const calendarEventUpdateParamsSchema = Type.Object({
  calendarId: Type.Optional(
    Type.String({ description: "Calendar identifier" }),
  ),
  eventId: Type.String({ description: "The ID of the event to update" }),
  summary: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  start: Type.Optional(
    Type.Object({
      dateTime: Type.Optional(Type.String()),
      date: Type.Optional(Type.String()),
      timeZone: Type.Optional(Type.String()),
    }),
  ),
  end: Type.Optional(
    Type.Object({
      dateTime: Type.Optional(Type.String()),
      date: Type.Optional(Type.String()),
      timeZone: Type.Optional(Type.String()),
    }),
  ),
  attendees: Type.Optional(
    Type.Array(
      Type.Object({
        email: Type.Optional(Type.String()),
        responseStatus: Type.Optional(Type.String()),
      }),
    ),
  ),
  sendNotifications: Type.Optional(
    Type.Boolean({
      description:
        "Whether to send notifications about the update of the event",
    }),
  ),
  sendUpdates: Type.Optional(
    Type.String({
      description:
        "Guests who should receive notifications about the update of the event",
    }),
  ),
});

export const calendarEventUpdateResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  htmlLink: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  status: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  created: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  updated: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  summary: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  description: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

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

export type CalendarEventUpdateParams = Static<
  typeof calendarEventUpdateParamsSchema
>;
export type CalendarEventUpdateResult = Static<
  typeof calendarEventUpdateResultSchema
>;

// ---------------------------------------------------------------------------
// Calendar Functions
// ---------------------------------------------------------------------------

export async function calendarEventCreate(
  params: CalendarEventCreateParams,
  ctx: ExecutionContext,
): Promise<CalendarEventCreateResult> {
  const calendar = createCalendarClient(ctx);

  try {
    const {
      calendarId = "primary",
      sendNotifications,
      sendUpdates,
      ...eventData
    } = params;

    const response = await calendar.events.insert({
      calendarId,
      sendNotifications,
      sendUpdates,
      requestBody: eventData,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Calendar event create error: ${error.message}`);
  }
}

export async function calendarEventsList(
  params: CalendarEventsListParams,
  ctx: ExecutionContext,
): Promise<CalendarEventsListResult> {
  const calendar = createCalendarClient(ctx);

  try {
    const { calendarId = "primary", ...listParams } = params;

    const response = await calendar.events.list({
      calendarId,
      ...listParams,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Calendar events list error: ${error.message}`);
  }
}

export async function calendarEventUpdate(
  params: CalendarEventUpdateParams,
  ctx: ExecutionContext,
): Promise<CalendarEventUpdateResult> {
  const calendar = createCalendarClient(ctx);

  try {
    const {
      calendarId = "primary",
      eventId,
      sendNotifications,
      sendUpdates,
      ...eventData
    } = params;

    const response = await calendar.events.update({
      calendarId,
      eventId,
      sendNotifications,
      sendUpdates,
      requestBody: eventData,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Calendar event update error: ${error.message}`);
  }
}
