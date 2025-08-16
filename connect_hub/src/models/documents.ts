import { Type, Static } from "@sinclair/typebox";
import {
  Ref,
  ErrorSchema,
  PaginatedResponseSchema,
  StringEnum,
} from "./shared.js";
import { TagSchema } from "./tags.js";

export enum DocumentStatus {
  Registered = "registered",
  Uploaded = "uploaded",
  Processing = "processing",
  Completed = "completed",
  Failed = "failed",
}
// Document presign request/response
export const DocumentPresignRequestSchema = Type.Object({
  filename: Type.String({ description: "Original filename" }),
  mimeType: Type.String({ description: "MIME type of the file" }),
  sizeBytes: Type.Number({
    description: "File size in bytes",
    minimum: 1,
    maximum: 10485760,
  }), // 10MB limit
  ownershipScope: Type.Optional(
    Type.Union([Type.Literal("user"), Type.Literal("organization")], {
      description: "Ownership scope (defaults to 'organization')",
      default: "organization",
    }),
  ),
  ownerId: Type.Optional(
    Type.String({ description: "Owner ID (optional for MVP)" }),
  ),
});

export const DocumentPresignResponseSchema = Type.Object({
  uploadUrl: Type.String({ description: "Presigned S3 upload URL" }),
  key: Type.String({ description: "S3 object key" }),
  documentId: Type.String({ description: "Generated document ID" }),
});

// Document finalize request (after S3 upload)
export const DocumentFinalizeRequestSchema = Type.Object({
  documentId: Type.String({ description: "Document ID from presign response" }),
  key: Type.String({ description: "S3 key from presign response" }),
});

export const DocumentFinalizeResponseSchema = Type.Object({
  status: Type.String({ description: "Processing status" }),
  message: Type.String({ description: "Status message" }),
});

export const DocumentStatusSchema = StringEnum(
  [
    DocumentStatus.Registered,
    DocumentStatus.Uploaded,
    DocumentStatus.Processing,
    DocumentStatus.Completed,
    DocumentStatus.Failed,
  ],
  { $id: "DocumentStatus" },
);

// Document status response
export const DocumentStatusResponseSchema = Type.Object({
  documentId: Type.String(),
  status: Ref(DocumentStatusSchema),
  title: Type.Optional(Type.String()),
  mimeType: Type.Optional(Type.String()),
  sizeBytes: Type.Optional(Type.String()),
  error: Type.Optional(Type.String()),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

// Document download response
export const DocumentDownloadResponseSchema = Type.Object({
  downloadUrl: Type.String({ description: "Presigned S3 download URL" }),
  filename: Type.String({ description: "Original filename" }),
  mimeType: Type.Optional(Type.String()),
  sizeBytes: Type.Optional(Type.String()),
  expiresIn: Type.Number({ description: "URL expiration time in seconds" }),
});

// Bulk snippets insert (for Lambda)
export const BulkSnippetsRequestSchema = Type.Object({
  orgId: Type.String(),
  documentId: Type.String(),
  ownershipScope: Type.Union([
    Type.Literal("user"),
    Type.Literal("organization"),
  ]),
  ownerId: Type.Optional(Type.String()),
  snippets: Type.Array(
    Type.Object({
      chunkIndex: Type.Number(),
      chunkCount: Type.Number(),
      blob: Type.String(),
      embedding: Type.Array(Type.Number(), { minItems: 1536, maxItems: 1536 }),
      checksum: Type.String(),
      metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    }),
  ),
});

export const BulkSnippetsResponseSchema = Type.Object({
  inserted: Type.Number({ description: "Number of snippets inserted" }),
  duplicates: Type.Number({ description: "Number of duplicates skipped" }),
});

// Ingestion complete (for Lambda)
export const IngestionCompleteRequestSchema = Type.Object({
  documentId: Type.String(),
  status: Ref(DocumentStatusSchema),
  error: Type.Optional(Type.String()),
  metadata: Type.Optional(
    Type.Object({
      pageCount: Type.Optional(Type.Number()),
      textBytes: Type.Optional(Type.Number()),
      extractionLib: Type.Optional(Type.String()),
      checksum: Type.Optional(Type.String()),
    }),
  ),
});

export const IngestionCompleteResponseSchema = Type.Object({
  status: Ref(DocumentStatusSchema),
});

// Documents list query and response schemas
export const DocumentsListQuerySchema = Type.Object({
  scope: Type.Optional(
    Type.Union([Type.Literal("user"), Type.Literal("organization")], {
      description: "Filter by ownership scope",
    }),
  ),
  owner: Type.Optional(Type.String({ description: "Filter by owner ID" })),
  type: Type.Optional(Type.String({ description: "Filter by MIME type" })),
  dateFrom: Type.Optional(
    Type.String({
      format: "date-time",
      description: "Filter documents created after this date",
    }),
  ),
  dateTo: Type.Optional(
    Type.String({
      format: "date-time",
      description: "Filter documents created before this date",
    }),
  ),
  q: Type.Optional(
    Type.String({
      description: "Text search query for document title and metadata",
      minLength: 1,
      maxLength: 500,
    }),
  ),
  tags: Type.Optional(
    Type.Array(Type.String(), {
      description: "Filter by document tags",
      maxItems: 10,
    }),
  ),
  page: Type.Optional(
    Type.Number({
      minimum: 1,
      default: 1,
      description: "Page number for pagination",
    }),
  ),
  limit: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 100,
      default: 20,
      description: "Number of items per page",
    }),
  ),
});

export const DocumentSchema = Type.Object(
  {
    id: Type.String(),
    orgId: Type.String(),
    documentId: Type.String(),
    documentType: Type.String(),
    documentUri: Type.String(),
    title: Type.String(),
    mimeType: Type.String(),
    sizeBytes: Type.String(),
    uploaderUserId: Type.String(),
    ownershipScope: Type.Union([
      Type.Literal("user"),
      Type.Literal("organization"),
    ]),
    ownerId: Type.String(),
    status: Ref(DocumentStatusSchema),
    tags: Type.Array(Ref(TagSchema)),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  },
  { $id: "Document" },
);

//export const DocumentsListResponseSchema = PaginatedResponseSchema(DocumentSchema);

// Knowledge snippets list query and response schemas
export const KnowledgeSnippetsListQuerySchema = Type.Object({
  scope: Type.Optional(
    Type.Union([Type.Literal("user"), Type.Literal("organization")], {
      description: "Filter by ownership scope",
    }),
  ),
  query: Type.Optional(
    Type.String({ description: "Text search query for snippet content" }),
  ),
  page: Type.Optional(
    Type.Number({
      minimum: 1,
      default: 1,
      description: "Page number for pagination",
    }),
  ),
  limit: Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: 100,
      default: 20,
      description: "Number of items per page",
    }),
  ),
});

export const KnowledgeSnippetSchema = Type.Object(
  {
    id: Type.String(),
    orgId: Type.String(),
    sourceRunId: Type.Optional(Type.String()),
    origin: Type.Union([Type.Literal("agent"), Type.Literal("user_upload")]),
    summary: Type.Optional(Type.String()),
    blob: Type.Optional(Type.String()),
    metadata: Type.Record(Type.String(), Type.Unknown()),
    ownershipScope: Type.Optional(
      Type.Union([Type.Literal("user"), Type.Literal("organization")]),
    ),
    ownerId: Type.Optional(Type.String()),
    documentId: Type.Optional(Type.String()),
    chunkIndex: Type.Optional(Type.Number()),
    chunkCount: Type.Optional(Type.Number()),
    checksum: Type.Optional(Type.String()),
    createdAt: Type.String({ format: "date-time" }),
  },
  { $id: "KnowledgeSnippet" },
);

export const DocumentPresignEndpoint = {
  tags: ["Documents"],
  description: "Generate presigned S3 upload URL for document",
  body: DocumentPresignRequestSchema,
  response: {
    200: DocumentPresignResponseSchema,
    400: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};
export const DocumentFinalizeEndpoint = {
  tags: ["Documents"],
  description: "Mark document as uploaded and trigger ingestion",
  body: DocumentFinalizeRequestSchema,
  response: {
    200: DocumentFinalizeResponseSchema,
    400: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

export const DocumentStatusEndpoint = {
  tags: ["Documents"],
  description: "Get document processing status",
  params: {
    type: "object",
    properties: {
      documentId: { type: "string" },
    },
    required: ["documentId"],
  },
  response: {
    200: DocumentStatusResponseSchema,
    400: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

export const DocumentDownloadEndpoint = {
  tags: ["Documents"],
  description: "Get presigned download URL for document",
  params: {
    type: "object",
    properties: {
      documentId: { type: "string" },
    },
    required: ["documentId"],
  },
  response: {
    200: DocumentDownloadResponseSchema,
    400: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};
export const DocumentIngestionCompleteEndpoint = {
  tags: ["Documents"],
  description: "Mark document ingestion as complete (internal)",
  body: IngestionCompleteRequestSchema,
  response: {
    200: IngestionCompleteResponseSchema,
    400: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
};
export const BulkSnippetsEndpoint = {
  tags: ["Documents"],
  description: "Bulk insert knowledge snippets (internal)",
  body: BulkSnippetsRequestSchema,
  response: {
    200: BulkSnippetsResponseSchema,
    400: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
};

export const DocumentsListEndpoint = {
  tags: ["Documents"],
  description: "List documents with optional filters",
  querystring: DocumentsListQuerySchema,
  response: {
    200: PaginatedResponseSchema(Ref(DocumentSchema)),
    400: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

export const KnowledgeSnippetsListEndpoint = {
  tags: ["Knowledge"],
  description: "List knowledge snippets with optional filters",
  querystring: KnowledgeSnippetsListQuerySchema,
  response: {
    200: PaginatedResponseSchema(Ref(KnowledgeSnippetSchema)),
    400: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

// Type exports
export type DocumentPresignRequest = Static<
  typeof DocumentPresignRequestSchema
>;
export type DocumentPresignResponse = Static<
  typeof DocumentPresignResponseSchema
>;
export type DocumentFinalizeRequest = Static<
  typeof DocumentFinalizeRequestSchema
>;
export type DocumentFinalizeResponse = Static<
  typeof DocumentFinalizeResponseSchema
>;
export type DocumentStatusResponse = Static<
  typeof DocumentStatusResponseSchema
>;
export type DocumentDownloadResponse = Static<
  typeof DocumentDownloadResponseSchema
>;
export type BulkSnippetsRequest = Static<typeof BulkSnippetsRequestSchema>;
export type BulkSnippetsResponse = Static<typeof BulkSnippetsResponseSchema>;
export type IngestionCompleteRequest = Static<
  typeof IngestionCompleteRequestSchema
>;
export type IngestionCompleteResponse = Static<
  typeof IngestionCompleteResponseSchema
>;
export type DocumentsListQuery = Static<typeof DocumentsListQuerySchema>;
export type KnowledgeSnippetsListQuery = Static<
  typeof KnowledgeSnippetsListQuerySchema
>;
export type Document = Static<typeof DocumentSchema>;
export type KnowledgeSnippet = Static<typeof KnowledgeSnippetSchema>;
