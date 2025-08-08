import type {
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
  FastifyTypeBox,
} from "../types/fastify.js";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import {
  documentStore,
  documentTags,
  tags as tagsTable,
} from "../database/schema.js";
import {
  TagsListEndpoint,
  TagCreateEndpoint,
  DocumentTagAttachEndpoint,
  DocumentTagDetachEndpoint,
  type TagsListQuery,
  TagSchema,
} from "../models/tags.js";
import { getAuth } from "@clerk/fastify";
import { ErrorSchema } from "../models/shared.js";

export async function tagsRoutes(app: FastifyTypeBox) {
  // GET /tags - list tags with counts
  app.addSchema(ErrorSchema);
  app.addSchema(TagSchema);
  app.get(
    "/tags",
    { schema: TagsListEndpoint },
    async (
      request: FastifyRequestTypeBox<typeof TagsListEndpoint>,
      reply: FastifyReplyTypeBox<typeof TagsListEndpoint>,
    ) => {
      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      const { search, page = 1, limit = 20 } = request.query;

      const nameCondition = search
        ? and(eq(tagsTable.orgId, orgId), ilike(tagsTable.name, `%${search}%`))
        : eq(tagsTable.orgId, orgId);

      const baseQuery = app.db
        .select({
          id: tagsTable.id,
          orgId: tagsTable.orgId,
          name: tagsTable.name,
          //createdBy: tagsTable.createdBy,
          createdAt: tagsTable.createdAt,
          updatedAt: tagsTable.updatedAt,
        })
        .from(tagsTable)
        .as("tags");

      // Count total tags
      const totalResult = await app.db
        .select({ total: count() })
        .from(baseQuery);
      const total = totalResult[0]?.total ?? 0;
      const offset = (page - 1) * limit;

      const rows = await app.db
        .select({
          id: tagsTable.id,
          orgId: tagsTable.orgId,
          name: tagsTable.name,
          createdAt: tagsTable.createdAt,
          updatedAt: tagsTable.updatedAt,
        })
        .from(baseQuery)
        .orderBy(desc(tagsTable.name))
        .limit(limit)
        .offset(offset);

      // Fetch counts per tag in bulk
      //const tagIds = rows.map((r) => r.id);
      //let counts: Record<string, number> = {};
      //if (tagIds.length > 0) {
      //  const countRows = await app.db
      //    .select({ tagId: documentTags.tagId, total: count() })
      //    .from(documentTags)
      //    .where(and(eq(documentTags.orgId, orgId)))
      //    .groupBy(documentTags.tagId);
      //  counts = Object.fromEntries(countRows.map((r) => [r.tagId, Number(r.total)]));
      //}

      return reply.status(200).send({
        data: rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        total,
        page,
        limit,
      });
    },
  );

  // POST /tags - create (idempotent by name)
  app.post(
    "/tags",
    { schema: TagCreateEndpoint },
    async (
      request: FastifyRequestTypeBox<typeof TagCreateEndpoint>,
      reply: FastifyReplyTypeBox<typeof TagCreateEndpoint>,
    ) => {
      const { orgId, userId } = getAuth(request);
      if (!orgId || !userId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "Authentication required",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      const { name } = request.body;

      // Upsert by (orgId, name)
      const existing = await app.db
        .select()
        .from(tagsTable)
        .where(and(eq(tagsTable.orgId, orgId), eq(tagsTable.name, name)))
        .limit(1);
      if (existing.length === 0) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Tag not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
      }
      const t = existing[0];
      if (t) {
        return reply.status(200).send({
          id: t.id,
          orgId: t.orgId,
          name: t.name,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        });
      }

      const insertedResult = await app.db
        .insert(tagsTable)
        .values({ orgId, name })
        .returning();

      const inserted = insertedResult[0]!;
      return reply.status(200).send({
        id: inserted.id,
        orgId: inserted.orgId,
        name: inserted.name,
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      });
    },
  );

  // POST /documents/:documentId/tags - attach tag by id or name
  app.post(
    "/documents/:documentId/tags",
    { schema: DocumentTagAttachEndpoint },
    async (
      request: FastifyRequestTypeBox<typeof DocumentTagAttachEndpoint>,
      reply: FastifyReplyTypeBox<typeof DocumentTagAttachEndpoint>,
    ) => {
      const { orgId } = getAuth(request);
      const { documentId } = request.params;
      const { tagId } = request.body;
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }
      // Validate document belongs to org
      const doc = await app.db
        .select({ id: documentStore.id })
        .from(documentStore)
        .where(
          and(
            eq(documentStore.orgId, orgId),
            eq(documentStore.documentId, documentId),
          ),
        )
        .limit(1);
      if (doc.length === 0) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Document not found",
          statusCode: 404,
          timestamp: new Date().toISOString(),
        });
      }
      // on conflict do nothing
      await app.db
        .insert(documentTags)
        .values({ orgId, documentId, tagId: tagId! })
        .onConflictDoNothing();
      return reply.status(200).send({ status: "ok" as const });
    },
  );

  // DELETE /documents/:documentId/tags/:tagId - detach
  app.delete(
    "/documents/:documentId/tags/:tagId",
    { schema: DocumentTagDetachEndpoint },
    async (
      request: FastifyRequestTypeBox<typeof DocumentTagDetachEndpoint>,
      reply: FastifyReplyTypeBox<typeof DocumentTagDetachEndpoint>,
    ) => {
      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      const { documentId, tagId } = request.params;

      await app.db
        .delete(documentTags)
        .where(
          and(
            eq(documentTags.orgId, orgId),
            eq(documentTags.documentId, documentId),
            eq(documentTags.tagId, tagId),
          ),
        );

      return reply.status(200).send({ status: "ok" as const });
    },
  );
}
