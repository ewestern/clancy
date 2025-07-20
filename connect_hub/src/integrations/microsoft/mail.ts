import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";

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
// Mail Send Capability Schemas
// ---------------------------------------------------------------------------
export const mailSendParamsSchema = Type.Object({
  toRecipients: Type.Array(
    Type.Object({
      emailAddress: Type.Object({
        address: Type.String({
          format: "email",
          description: "Recipient email address",
        }),
        name: Type.Optional(
          Type.String({ description: "Recipient display name" }),
        ),
      }),
    }),
  ),
  ccRecipients: Type.Optional(
    Type.Array(
      Type.Object({
        emailAddress: Type.Object({
          address: Type.String({ format: "email" }),
          name: Type.Optional(Type.String()),
        }),
      }),
    ),
  ),
  bccRecipients: Type.Optional(
    Type.Array(
      Type.Object({
        emailAddress: Type.Object({
          address: Type.String({ format: "email" }),
          name: Type.Optional(Type.String()),
        }),
      }),
    ),
  ),
  subject: Type.String({ description: "Email subject line" }),
  body: Type.Object({
    contentType: Type.Union([Type.Literal("text"), Type.Literal("html")], {
      description: "Content type of the message body",
      default: "html",
    }),
    content: Type.String({ description: "Email body content" }),
  }),
  importance: Type.Optional(
    Type.Union(
      [Type.Literal("low"), Type.Literal("normal"), Type.Literal("high")],
      {
        description: "Message importance level",
        default: "normal",
      },
    ),
  ),
  saveToSentItems: Type.Optional(
    Type.Boolean({
      description: "Whether to save the message to Sent Items",
      default: true,
    }),
  ),
  fromMailbox: Type.Optional(
    Type.String({
      format: "email",
      description: "Send from specific mailbox (requires Send As permissions)",
    }),
  ),
});

export const mailSendResultSchema = Type.Object({
  id: Type.String({ description: "Unique identifier of the sent message" }),
  internetMessageId: Type.Optional(
    Type.String({ description: "Internet message ID" }),
  ),
  subject: Type.String({ description: "Message subject" }),
  sentDateTime: Type.String({
    format: "date-time",
    description: "When the message was sent",
  }),
  webLink: Type.Optional(
    Type.String({ description: "Web link to the message" }),
  ),
});

// ---------------------------------------------------------------------------
// Mail List Capability Schemas
// ---------------------------------------------------------------------------
export const mailMessagesListParamsSchema = Type.Object({
  search: Type.Optional(
    Type.String({
      description: "Search query (subject, from, body keywords)",
    }),
  ),
  filter: Type.Optional(
    Type.String({
      description:
        "OData filter expression (e.g., \"from/emailAddress/address eq 'user@domain.com'\")",
    }),
  ),
  orderBy: Type.Optional(
    Type.String({
      description: "Order by field (e.g., 'receivedDateTime desc')",
      default: "receivedDateTime desc",
    }),
  ),
  select: Type.Optional(
    Type.Array(Type.String(), {
      description: "Specific properties to return",
      default: [
        "id",
        "subject",
        "from",
        "receivedDateTime",
        "isRead",
        "importance",
      ],
    }),
  ),
  top: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 1000,
      description: "Maximum number of messages to return",
      default: 50,
    }),
  ),
  skip: Type.Optional(
    Type.Number({
      minimum: 0,
      description: "Number of messages to skip for pagination",
      default: 0,
    }),
  ),
  mailbox: Type.Optional(
    Type.String({
      format: "email",
      description:
        "Mailbox to query (defaults to authenticated user's mailbox)",
    }),
  ),
});

export const mailMessagesListResultSchema = Type.Object({
  value: Type.Array(
    Type.Object({
      id: Type.String({ description: "Message ID" }),
      subject: Type.Optional(Type.String({ description: "Message subject" })),
      from: Type.Optional(
        Type.Object({
          emailAddress: Type.Object({
            address: Type.String({ description: "Sender email address" }),
            name: Type.Optional(
              Type.String({ description: "Sender display name" }),
            ),
          }),
        }),
      ),
      toRecipients: Type.Optional(
        Type.Array(
          Type.Object({
            emailAddress: Type.Object({
              address: Type.String(),
              name: Type.Optional(Type.String()),
            }),
          }),
        ),
      ),
      receivedDateTime: Type.String({
        format: "date-time",
        description: "When message was received",
      }),
      sentDateTime: Type.Optional(Type.String({ format: "date-time" })),
      isRead: Type.Boolean({
        description: "Whether the message has been read",
      }),
      importance: Type.Union([
        Type.Literal("low"),
        Type.Literal("normal"),
        Type.Literal("high"),
      ]),
      hasAttachments: Type.Boolean({
        description: "Whether the message has attachments",
      }),
      bodyPreview: Type.Optional(
        Type.String({ description: "Preview of message body" }),
      ),
      webLink: Type.Optional(
        Type.String({ description: "Web link to the message" }),
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
// Type definitions derived from schemas
// ---------------------------------------------------------------------------
export type MailSendParams = Static<typeof mailSendParamsSchema>;
export type MailSendResult = Static<typeof mailSendResultSchema>;
export type MailMessagesListParams = Static<
  typeof mailMessagesListParamsSchema
>;
export type MailMessagesListResult = Static<
  typeof mailMessagesListResultSchema
>;

// ---------------------------------------------------------------------------
// Capability implementations
// ---------------------------------------------------------------------------
export async function mailSend(
  params: MailSendParams,
  ctx: ExecutionContext,
): Promise<MailSendResult> {
  const client = createGraphClient(ctx);

  try {
    const message = {
      toRecipients: params.toRecipients,
      ccRecipients: params.ccRecipients,
      bccRecipients: params.bccRecipients,
      subject: params.subject,
      body: params.body,
      importance: params.importance || "normal",
    };

    const endpoint = params.fromMailbox
      ? `/users/${params.fromMailbox}/sendMail`
      : "/me/sendMail";

    const requestBody = {
      message,
      saveToSentItems: params.saveToSentItems !== false,
    };

    const response = await client.api(endpoint).post(requestBody);

    // For sendMail, Graph returns 202 Accepted with empty body
    // We need to get the message from Sent Items to return details
    const sentMessage = await client
      .api(
        params.fromMailbox
          ? `/users/${params.fromMailbox}/mailFolders/sentitems/messages`
          : "/me/mailFolders/sentitems/messages",
      )
      .top(1)
      .orderby("sentDateTime desc")
      .filter(`subject eq '${params.subject.replace(/'/g, "''")}'`)
      .get();

    const sentItem = sentMessage.value?.[0];
    if (!sentItem) {
      throw new Error("Message sent but could not retrieve details");
    }

    return {
      id: sentItem.id,
      internetMessageId: sentItem.internetMessageId,
      subject: sentItem.subject,
      sentDateTime: sentItem.sentDateTime,
      webLink: sentItem.webLink,
    };
  } catch (error: any) {
    // Handle rate limiting
    if (error.status === 429 || error.code === 429) {
      const retryAfter = error.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Microsoft Graph mail send error: ${error.message}`);
  }
}

export async function mailMessagesList(
  params: MailMessagesListParams,
  ctx: ExecutionContext,
): Promise<MailMessagesListResult> {
  const client = createGraphClient(ctx);

  try {
    let query = client.api(
      params.mailbox ? `/users/${params.mailbox}/messages` : "/me/messages",
    );

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
    throw new Error(`Microsoft Graph mail list error: ${error.message}`);
  }
}
