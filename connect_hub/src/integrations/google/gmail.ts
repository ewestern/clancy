import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { google } from "googleapis";

// ---------------------------------------------------------------------------
// Gmail API helper
// ---------------------------------------------------------------------------
function createGmailClient(ctx: ExecutionContext) {
  if (!ctx?.tokenPayload) throw new Error("Google token missing");

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(ctx.tokenPayload as Record<string, unknown>);

  return google.gmail({ version: "v1", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// Gmail Schemas
// ---------------------------------------------------------------------------

export const gmailSendParamsSchema = Type.Object({
  raw: Type.Optional(
    Type.String({ description: "Base64-encoded RFC 2822 formatted message" }),
  ),
  threadId: Type.Optional(
    Type.String({ description: "ID of the thread the message replies to" }),
  ),
});

export const gmailSendResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  threadId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  labelIds: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
});

export const gmailSearchParamsSchema = Type.Object({
  q: Type.Optional(Type.String({ description: "Gmail search query" })),
  maxResults: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 500,
      description: "Maximum number of messages to return",
      default: 10,
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description: "Page token to retrieve a specific page of results",
    }),
  ),
  labelIds: Type.Optional(
    Type.Array(
      Type.String({
        description:
          "Only return messages with labels that match all of the specified label IDs",
      }),
    ),
  ),
  includeSpamTrash: Type.Optional(
    Type.Boolean({
      description: "Include messages from SPAM and TRASH in the results",
    }),
  ),
});
export const gmailMessagePayloadSchema = Type.Object({
  headers: Type.Optional(
    Type.Array(
      Type.Object({
        name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        value: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      }),
    ),
  ),
  body: Type.Optional(
    Type.Object({
      size: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
      data: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
});

export const gmailSearchResultSchema = Type.Object({
  messages: Type.Array(
    Type.Object({
      id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      labelIds: Type.Optional(
        Type.Union([Type.Array(Type.String()), Type.Null()]),
      ),
      payload: Type.Optional(gmailMessagePayloadSchema),
      threadId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
  nextPageToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  resultSizeEstimate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
});

// ---------------------------------------------------------------------------
// Gmail Messages Get Schemas
// ---------------------------------------------------------------------------

export const gmailMessagesGetParamsSchema = Type.Object({
  id: Type.String({ description: "The ID of the message to retrieve" }),
  format: Type.Optional(
    Type.Union(
      [
        Type.Literal("minimal"),
        Type.Literal("full"),
        Type.Literal("raw"),
        Type.Literal("metadata"),
      ],
      { description: "The format to return the message in" },
    ),
  ),
  metadataHeaders: Type.Optional(
    Type.Array(
      Type.String({
        description: "When format is METADATA, only include headers specified",
      }),
    ),
  ),
});

export const gmailMessagesGetResultSchema = Type.Object(
  {
    id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    threadId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    labelIds: Type.Optional(
      Type.Union([Type.Array(Type.String()), Type.Null()]),
    ),
    snippet: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    historyId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    internalDate: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    payload: Type.Optional(gmailMessagePayloadSchema),
    sizeEstimate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    raw: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  },
  {
    examples: [
      {
        id: "1234567890abcdef",
        threadId: "1234567890abcdef",
        labelIds: ["INBOX", "IMPORTANT", "CATEGORY_PERSONAL"],
        snippet: "Hey there! Just wanted to follow up on our meeting...",
        historyId: "987654321",
        internalDate: "1609459200000",
        payload: {
          headers: [
            { name: "From", value: "sender@example.com" },
            { name: "To", value: "recipient@example.com" },
            { name: "Subject", value: "Meeting Follow-up" },
          ],
          body: {
            size: 123,
            data: "SGV5IHRoZXJlISBKdXN0IHdhbnRlZCB0byBmb2xsb3cgdXAuLi4=",
          },
        },
        sizeEstimate: 2048,
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// Gmail Labels Schemas
// ---------------------------------------------------------------------------

export const gmailLabelsCreateParamsSchema = Type.Object({
  name: Type.String({ description: "The display name of the label" }),
  messageListVisibility: Type.Optional(
    Type.Union([Type.Literal("show"), Type.Literal("hide")], {
      description: "Whether to show the label in the message list",
    }),
  ),
  labelListVisibility: Type.Optional(
    Type.Union(
      [
        Type.Literal("labelShow"),
        Type.Literal("labelShowIfUnread"),
        Type.Literal("labelHide"),
      ],
      { description: "The visibility of the label in the label list" },
    ),
  ),
  type: Type.Optional(
    Type.Union([Type.Literal("system"), Type.Literal("user")], {
      description: "The type of label",
    }),
  ),
  color: Type.Optional(
    Type.Object({
      textColor: Type.Optional(
        Type.String({ description: "The text color of the label" }),
      ),
      backgroundColor: Type.Optional(
        Type.String({ description: "The background color of the label" }),
      ),
    }),
  ),
});

export const gmailLabelsCreateResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  type: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  messageListVisibility: Type.Optional(
    Type.Union([Type.String(), Type.Null()]),
  ),
  labelListVisibility: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  color: Type.Optional(
    Type.Object({
      textColor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      backgroundColor: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }),
  ),
});

export const gmailLabelsListParamsSchema = Type.Object({
  maxResults: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 500,
      description: "Maximum number of labels to return",
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description: "Page token to retrieve a specific page of results",
    }),
  ),
});

export const gmailLabelsListResultSchema = Type.Object({
  labels: Type.Array(
    Type.Object({
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
    }),
  ),
});

export const gmailLabelsGetParamsSchema = Type.Object({
  id: Type.String({ description: "The ID of the label to retrieve" }),
});

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

// ---------------------------------------------------------------------------
// Gmail Attachments Schemas
// ---------------------------------------------------------------------------

export const gmailMessagesAttachmentsGetParamsSchema = Type.Object({
  messageId: Type.String({
    description: "The ID of the message containing the attachment",
  }),
  id: Type.String({ description: "The ID of the attachment" }),
});

export const gmailMessagesAttachmentsGetResultSchema = Type.Object({
  attachmentId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  size: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  data: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

// ---------------------------------------------------------------------------
// Gmail Drafts Schemas
// ---------------------------------------------------------------------------

export const gmailDraftsCreateParamsSchema = Type.Object({
  message: Type.Object({
    raw: Type.Optional(
      Type.String({ description: "Base64-encoded RFC 2822 formatted message" }),
    ),
    threadId: Type.Optional(
      Type.String({ description: "ID of the thread the message replies to" }),
    ),
  }),
});

export const gmailDraftsCreateResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  message: Type.Optional(
    Type.Object({
      id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      threadId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      labelIds: Type.Optional(
        Type.Union([Type.Array(Type.String()), Type.Null()]),
      ),
    }),
  ),
});

export const gmailDraftsListParamsSchema = Type.Object({
  maxResults: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 500,
      description: "Maximum number of drafts to return",
    }),
  ),
  pageToken: Type.Optional(
    Type.String({
      description: "Page token to retrieve a specific page of results",
    }),
  ),
  q: Type.Optional(
    Type.String({ description: "Gmail search query to filter drafts" }),
  ),
  includeSpamTrash: Type.Optional(
    Type.Boolean({
      description: "Include drafts from SPAM and TRASH in the results",
    }),
  ),
});

export const gmailDraftsListResultSchema = Type.Object({
  drafts: Type.Array(
    Type.Object({
      id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      message: Type.Optional(
        Type.Object({
          id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          threadId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
          labelIds: Type.Optional(
            Type.Union([Type.Array(Type.String()), Type.Null()]),
          ),
        }),
      ),
    }),
  ),
  nextPageToken: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  resultSizeEstimate: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
});

export const gmailDraftsGetParamsSchema = Type.Object({
  id: Type.String({ description: "The ID of the draft to retrieve" }),
  format: Type.Optional(
    Type.Union(
      [
        Type.Literal("minimal"),
        Type.Literal("full"),
        Type.Literal("raw"),
        Type.Literal("metadata"),
      ],
      { description: "The format to return the draft in" },
    ),
  ),
});

export const gmailDraftsGetResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  message: Type.Optional(
    Type.Object({
      id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      threadId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
      labelIds: Type.Optional(
        Type.Union([Type.Array(Type.String()), Type.Null()]),
      ),
      payload: Type.Optional(gmailMessagePayloadSchema),
    }),
  ),
});

export const gmailDraftsSendParamsSchema = Type.Object({
  id: Type.String({ description: "The ID of the draft to send" }),
});

export const gmailDraftsSendResultSchema = Type.Object({
  id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  threadId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  labelIds: Type.Optional(Type.Union([Type.Array(Type.String()), Type.Null()])),
});

// ---------------------------------------------------------------------------
// Type definitions (TypeBox Static pattern)
// ---------------------------------------------------------------------------

export type GmailSendParams = Static<typeof gmailSendParamsSchema>;
export type GmailSendResult = Static<typeof gmailSendResultSchema>;
export type GmailSearchParams = Static<typeof gmailSearchParamsSchema>;
export type GmailSearchResult = Static<typeof gmailSearchResultSchema>;

export type GmailMessagesGetParams = Static<
  typeof gmailMessagesGetParamsSchema
>;
export type GmailMessagesGetResult = Static<
  typeof gmailMessagesGetResultSchema
>;

export type GmailLabelsCreateParams = Static<
  typeof gmailLabelsCreateParamsSchema
>;
export type GmailLabelsCreateResult = Static<
  typeof gmailLabelsCreateResultSchema
>;
export type GmailLabelsListParams = Static<typeof gmailLabelsListParamsSchema>;
export type GmailLabelsListResult = Static<typeof gmailLabelsListResultSchema>;
export type GmailLabelsGetParams = Static<typeof gmailLabelsGetParamsSchema>;
export type GmailLabelsGetResult = Static<typeof gmailLabelsGetResultSchema>;

export type GmailMessagesAttachmentsGetParams = Static<
  typeof gmailMessagesAttachmentsGetParamsSchema
>;
export type GmailMessagesAttachmentsGetResult = Static<
  typeof gmailMessagesAttachmentsGetResultSchema
>;

export type GmailDraftsCreateParams = Static<
  typeof gmailDraftsCreateParamsSchema
>;
export type GmailDraftsCreateResult = Static<
  typeof gmailDraftsCreateResultSchema
>;
export type GmailDraftsListParams = Static<typeof gmailDraftsListParamsSchema>;
export type GmailDraftsListResult = Static<typeof gmailDraftsListResultSchema>;
export type GmailDraftsGetParams = Static<typeof gmailDraftsGetParamsSchema>;
export type GmailDraftsGetResult = Static<typeof gmailDraftsGetResultSchema>;
export type GmailDraftsSendParams = Static<typeof gmailDraftsSendParamsSchema>;
export type GmailDraftsSendResult = Static<typeof gmailDraftsSendResultSchema>;

// ---------------------------------------------------------------------------
// Gmail Functions
// ---------------------------------------------------------------------------

export async function gmailSend(
  params: GmailSendParams,
  ctx: ExecutionContext,
): Promise<GmailSendResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: params,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail send error: ${error.message}`);
  }
}

export async function gmailSearch(
  params: GmailSearchParams,
  ctx: ExecutionContext,
): Promise<GmailSearchResult> {
  const gmail = createGmailClient(ctx);

  try {
    const { data } = await gmail.users.messages.list({
      userId: "me",
      ...params,
    });
    const allMessages = data.messages || [];
    const promises = allMessages.map(async (message) => {
      return gmail.users.messages.get({
        userId: "me",
        id: message.id || undefined,
      });
    });

    const allMessageResponses = await Promise.all(promises);

    return {
      messages: allMessageResponses.map((response) => response.data),
      nextPageToken: data.nextPageToken,
      resultSizeEstimate: data.resultSizeEstimate,
    };
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail search error: ${error.message}`);
  }
}

export async function gmailMessagesGet(
  params: GmailMessagesGetParams,
  ctx: ExecutionContext,
): Promise<GmailMessagesGetResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id: params.id,
      format: params.format,
      metadataHeaders: params.metadataHeaders,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail messages get error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Gmail Labels Functions
// ---------------------------------------------------------------------------

export async function gmailLabelsCreate(
  params: GmailLabelsCreateParams,
  ctx: ExecutionContext,
): Promise<GmailLabelsCreateResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.labels.create({
      userId: "me",
      requestBody: params,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail labels create error: ${error.message}`);
  }
}

export async function gmailLabelsList(
  params: GmailLabelsListParams,
  ctx: ExecutionContext,
): Promise<GmailLabelsListResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.labels.list({
      userId: "me",
      ...params,
    });

    return {
      labels: response.data.labels || [],
    };
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail labels list error: ${error.message}`);
  }
}

export async function gmailLabelsGet(
  params: GmailLabelsGetParams,
  ctx: ExecutionContext,
): Promise<GmailLabelsGetResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.labels.get({
      userId: "me",
      id: params.id,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail labels get error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Gmail Attachments Functions
// ---------------------------------------------------------------------------

export async function gmailMessagesAttachmentsGet(
  params: GmailMessagesAttachmentsGetParams,
  ctx: ExecutionContext,
): Promise<GmailMessagesAttachmentsGetResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: params.messageId,
      id: params.id,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail messages attachments get error: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Gmail Drafts Functions
// ---------------------------------------------------------------------------

export async function gmailDraftsCreate(
  params: GmailDraftsCreateParams,
  ctx: ExecutionContext,
): Promise<GmailDraftsCreateResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: params,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail drafts create error: ${error.message}`);
  }
}

export async function gmailDraftsList(
  params: GmailDraftsListParams,
  ctx: ExecutionContext,
): Promise<GmailDraftsListResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.drafts.list({
      userId: "me",
      ...params,
    });

    return {
      drafts: response.data.drafts || [],
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail drafts list error: ${error.message}`);
  }
}

export async function gmailDraftsGet(
  params: GmailDraftsGetParams,
  ctx: ExecutionContext,
): Promise<GmailDraftsGetResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.drafts.get({
      userId: "me",
      id: params.id,
      format: params.format,
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail drafts get error: ${error.message}`);
  }
}

export async function gmailDraftsSend(
  params: GmailDraftsSendParams,
  ctx: ExecutionContext,
): Promise<GmailDraftsSendResult> {
  const gmail = createGmailClient(ctx);

  try {
    const response = await gmail.users.drafts.send({
      userId: "me",
      requestBody: { id: params.id },
    });

    return response.data;
  } catch (error: any) {
    if (error.code === 429) {
      const retryAfter = error.response?.headers?.["retry-after"] ?? "60";
      throw new Error(`Rate limited; retry after ${retryAfter}s`);
    }
    throw new Error(`Gmail drafts send error: ${error.message}`);
  }
}
