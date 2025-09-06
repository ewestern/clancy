import { Type, Static } from "@sinclair/typebox";
import { Ref, ErrorSchema, PaginatedResponseSchema } from "./shared.js";

export const TagSchema = Type.Object(
  {
    id: Type.String(),
    orgId: Type.String(),
    name: Type.String(),
    //createdBy: Type.Optional(Type.String()),
    createdAt: Type.String({ format: "date-time" }),
    updatedAt: Type.String({ format: "date-time" }),
  },
  { $id: "Tag" },
);

export const TagsListQuerySchema = Type.Object({
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
});

export const TagsListEndpoint = {
  tags: ["Tags"],
  description: "List tags with usage counts",
  querystring: TagsListQuerySchema,
  response: {
    200: PaginatedResponseSchema(Ref(TagSchema)),
    400: Ref(ErrorSchema),
    401: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

export const TagCreateRequestSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
});

export const TagCreateEndpoint = {
  tags: ["Tags"],
  description: "Create a tag in the organization (idempotent by name)",
  body: TagCreateRequestSchema,
  response: {
    200: TagSchema,
    400: Ref(ErrorSchema),
    401: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

export const DocumentTagAttachEndpoint = {
  tags: ["Tags"],
  description: "Attach a tag to a document (create tag by name if needed)",
  params: Type.Object({
    documentId: Type.String(),
  }),
  body: Type.Object({
    tagId: Type.String(),
  }),
  response: {
    200: Type.Object({ status: Type.Literal("ok") }),
    400: Ref(ErrorSchema),
    401: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

export const DocumentTagDetachEndpoint = {
  tags: ["Tags"],
  description: "Detach a tag from a document",
  params: Type.Object({
    documentId: Type.String(),
    tagId: Type.String(),
  }),
  response: {
    200: Type.Object({ status: Type.Literal("ok") }),
    400: Ref(ErrorSchema),
    401: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
  security: [{ bearerAuth: [] }],
};

export type Tag = Static<typeof TagSchema>;
export type TagsListQuery = Static<typeof TagsListQuerySchema>;
export type TagCreateRequest = Static<typeof TagCreateRequestSchema>;
