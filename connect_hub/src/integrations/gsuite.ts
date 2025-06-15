import {
  ProviderRuntime,
  Capability,
  ExecutionContext,
  CapabilityMeta,
} from "../providers/types.js";
import { ProviderKind, ProviderAuth } from "../models/capabilities.js";
import { Type, Static } from "@sinclair/typebox";
import { loadPrompts } from "../providers/utils.js";
import { Buffer } from "node:buffer";
const __dirname = import.meta.dirname;

// ---------------------------------------------------------------------------
// GSuite API helper - unified for all Google services
// ---------------------------------------------------------------------------
async function gsuiteFetch<T>(
  service: "gmail" | "calendar" | "drive" | "sheets",
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  params?: unknown,
  ctx?: ExecutionContext,
): Promise<T> {
  if (!ctx?.accessToken) throw new Error("GSuite access token missing");

  const baseUrls = {
    gmail: "https://gmail.googleapis.com/gmail/v1",
    calendar: "https://www.googleapis.com/calendar/v3",
    drive: "https://www.googleapis.com/drive/v3",
    sheets: "https://sheets.googleapis.com/v4"
  };

  const url = `${baseUrls[service]}${endpoint}`;
  
  const res = await globalThis.fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${ctx.accessToken}`,
      "Content-Type": "application/json",
    },
    body: method !== "GET" ? JSON.stringify(params ?? {}) : undefined,
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") ?? "60";
    throw new Error(`Rate limited; retry after ${retryAfter}s`);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSuite ${service} HTTP ${res.status}: ${text}`);
  }

  return res.json() as T;
}

// ---------------------------------------------------------------------------
// Gmail Capabilities
// ---------------------------------------------------------------------------

const gmailSendParamsSchema = Type.Object({
  to: Type.Array(Type.String({ format: "email" })),
  cc: Type.Optional(Type.Array(Type.String({ format: "email" }))),
  bcc: Type.Optional(Type.Array(Type.String({ format: "email" }))),
  subject: Type.String(),
  body: Type.String(),
  isHtml: Type.Optional(Type.Boolean({ default: false }))
});

const gmailSendResultSchema = Type.Object({
  id: Type.String(),
  threadId: Type.String(),
  labelIds: Type.Array(Type.String())
});


type GmailSendParams = Static<typeof gmailSendParamsSchema>;
type GmailSendResult = Static<typeof gmailSendResultSchema>;


async function gmailSend(params: GmailSendParams, ctx: ExecutionContext): Promise<GmailSendResult> {
  const headers = [
    `To: ${params.to.join(", ")}`,
    ...(params.cc ? [`Cc: ${params.cc.join(", ")}`] : []),
    ...(params.bcc ? [`Bcc: ${params.bcc.join(", ")}`] : []),
    `Subject: ${params.subject}`,
    params.isHtml ? "Content-Type: text/html; charset=utf-8" : "Content-Type: text/plain; charset=utf-8"
  ];

  const message = [...headers, "", params.body].join("\r\n");
  const encodedMessage = Buffer.from(message).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return gsuiteFetch<GmailSendResult>("gmail", "/users/me/messages/send", "POST", {
    raw: encodedMessage
  }, ctx);
}

const gmailSearchParamsSchema = Type.Object({
  query: Type.String({ description: "Gmail search query" }),
  maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 500, default: 10 }))
});

const gmailSearchResultSchema = Type.Object({
  messages: Type.Optional(Type.Array(Type.Object({
    id: Type.String(),
    threadId: Type.String()
  }))),
  resultSizeEstimate: Type.Number()
});

type GmailSearchParams = Static<typeof gmailSearchParamsSchema>;
type GmailSearchResult = Static<typeof gmailSearchResultSchema>;




async function gmailSearch(params: GmailSearchParams, ctx: ExecutionContext): Promise<GmailSearchResult> {
  const queryString = `q=${encodeURIComponent(params.query)}&maxResults=${params.maxResults || 10}`;
  return gsuiteFetch<GmailSearchResult>("gmail", `/users/me/messages?${queryString}`, "GET", undefined, ctx);
}

// ---------------------------------------------------------------------------
// Calendar Capabilities  
// ---------------------------------------------------------------------------

const calendarEventCreateParamsSchema = Type.Object({
  calendarId: Type.Optional(Type.String({ default: "primary" })),
  summary: Type.String(),
  description: Type.Optional(Type.String()),
  start: Type.Object({
    dateTime: Type.String({ format: "date-time" }),
    timeZone: Type.Optional(Type.String())
  }),
  end: Type.Object({
    dateTime: Type.String({ format: "date-time" }),
    timeZone: Type.Optional(Type.String())
  }),
  attendees: Type.Optional(Type.Array(Type.Object({
    email: Type.String({ format: "email" }),
    responseStatus: Type.Optional(Type.Union([
      Type.Literal("needsAction"),
      Type.Literal("accepted"), 
      Type.Literal("declined"),
      Type.Literal("tentative")
    ]))
  }))),
  sendNotifications: Type.Optional(Type.Boolean({ default: true }))
});

const calendarEventCreateResultSchema = Type.Object({
  id: Type.String(),
  htmlLink: Type.String(),
  status: Type.String(),
  created: Type.String(),
  updated: Type.String()
});

type CalendarEventCreateParams = Static<typeof calendarEventCreateParamsSchema>;
type CalendarEventCreateResult = Static<typeof calendarEventCreateResultSchema>;


async function calendarEventCreate(params: CalendarEventCreateParams, ctx: ExecutionContext): Promise<CalendarEventCreateResult> {
  const calendarId = params.calendarId || "primary";
  const eventData = {
    summary: params.summary,
    description: params.description,
    start: params.start,
    end: params.end,
    attendees: params.attendees
  };

  const query = params.sendNotifications ? "?sendNotifications=true" : "";
  return gsuiteFetch<CalendarEventCreateResult>("calendar", `/calendars/${encodeURIComponent(calendarId)}/events${query}`, "POST", eventData, ctx);
}

const calendarEventsListParamsSchema = Type.Object({
  calendarId: Type.Optional(Type.String({ default: "primary" })),
  timeMin: Type.Optional(Type.String({ format: "date-time" })),
  timeMax: Type.Optional(Type.String({ format: "date-time" })),
  maxResults: Type.Optional(Type.Number({ minimum: 1, maximum: 2500, default: 250 })),
  q: Type.Optional(Type.String({ description: "Search query" }))
});

const calendarEventsListResultSchema = Type.Object({
  items: Type.Array(Type.Object({
    id: Type.String(),
    summary: Type.String(),
    start: Type.Object({
      dateTime: Type.Optional(Type.String()),
      date: Type.Optional(Type.String())
    }),
    end: Type.Object({
      dateTime: Type.Optional(Type.String()),
      date: Type.Optional(Type.String())
    })
  })),
  nextPageToken: Type.Optional(Type.String())
});

type CalendarEventsListParams = Static<typeof calendarEventsListParamsSchema>;
type CalendarEventsListResult = Static<typeof calendarEventsListResultSchema>;


async function calendarEventsList(params: CalendarEventsListParams, ctx: ExecutionContext): Promise<CalendarEventsListResult> {
  const calendarId = params.calendarId || "primary";
  const queryParts = [];
  
  if (params.timeMin) queryParts.push(`timeMin=${encodeURIComponent(params.timeMin)}`);
  if (params.timeMax) queryParts.push(`timeMax=${encodeURIComponent(params.timeMax)}`);
  if (params.maxResults) queryParts.push(`maxResults=${params.maxResults}`);
  if (params.q) queryParts.push(`q=${encodeURIComponent(params.q)}`);
  
  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return gsuiteFetch<CalendarEventsListResult>("calendar", `/calendars/${encodeURIComponent(calendarId)}/events${queryString}`, "GET", undefined, ctx);
}

// ---------------------------------------------------------------------------
// GSuite Provider
// ---------------------------------------------------------------------------
export class GSuiteProvider implements ProviderRuntime {
  private cache = new Map<string, Capability>();

  public readonly metadata = {
    id: "gsuite",
    displayName: "Google Workspace",
    description: "Integrated Google productivity and collaboration tools",
    icon: "https://developers.google.com/identity/images/g-logo.png",
    docsUrl: "https://developers.google.com/workspace",
    kind: ProviderKind.External,
    auth: ProviderAuth.OAuth2,
  } as const;

  getCapability<P, R>(capId: string): Capability<P, R> {
    if (!this.cache.has(capId)) {
      switch (capId) {
        // Gmail capabilities
        case "gmail.send": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Send Email",
            description: "Send an email via Gmail",
            docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/send",
            paramsSchema: gmailSendParamsSchema,
            resultSchema: gmailSendResultSchema,
            requiredScopes: ["https://www.googleapis.com/auth/gmail.send"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: gmailSend });
          break;
        }
        case "gmail.search": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Search Emails",
            description: "Search for emails using Gmail query syntax",
            docsUrl: "https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list",
            paramsSchema: gmailSearchParamsSchema,
            resultSchema: gmailSearchResultSchema,
            requiredScopes: ["https://www.googleapis.com/auth/gmail.readonly"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: gmailSearch });
          break;
        }
        // Calendar capabilities
        case "calendar.event.create": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "Create Calendar Event",
            description: "Create a new calendar event",
            docsUrl: "https://developers.google.com/calendar/api/v3/reference/events/insert",
            paramsSchema: calendarEventCreateParamsSchema,
            resultSchema: calendarEventCreateResultSchema,
            requiredScopes: ["https://www.googleapis.com/auth/calendar"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: calendarEventCreate });
          break;
        }
        case "calendar.events.list": {
          const meta: CapabilityMeta = {
            id: capId,
            displayName: "List Calendar Events",
            description: "List events from a calendar",
            docsUrl: "https://developers.google.com/calendar/api/v3/reference/events/list",
            paramsSchema: calendarEventsListParamsSchema,
            resultSchema: calendarEventsListResultSchema,
            requiredScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
            promptVersions: loadPrompts(__dirname, capId),
          };
          this.cache.set(capId, { meta, execute: calendarEventsList });
          break;
        }
        default:
          throw new Error(`GSuite capability ${capId} not implemented`);
      }
    }
    return this.cache.get(capId)! as Capability<P, R>;
  }

  listCapabilities() {
    const knownCapabilities = [
      "gmail.send",
      "gmail.search", 
      "calendar.event.create",
      "calendar.events.list"
    ];
    
    knownCapabilities.forEach((k) => this.getCapability(k));
    return [...this.cache.values()].map((c) => c.meta);
  }
} 