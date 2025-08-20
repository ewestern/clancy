import type { FastifyTypeBox } from "../types/fastify.js";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import {
  eq,
  and,
  or,
  gte,
  lte,
  ilike,
  count,
  desc,
  inArray,
  sql,
  exists,
} from "drizzle-orm";
import {
  documentStore,
  knowledgeSnippets,
  KnowledgeSnippetOrigin,
  tags as tagsTable,
  documentTags,
} from "../database/schema.js";
import {
  type DocumentPresignRequest,
  type DocumentFinalizeRequest,
  type BulkSnippetsRequest,
  type KnowledgeSnippetsListQuery,
  DocumentPresignEndpoint,
  DocumentFinalizeEndpoint,
  DocumentStatusEndpoint,
  DocumentGetEndpoint,
  DocumentDownloadEndpoint,
  DocumentDeleteEndpoint,
  DocumentIngestionCompleteEndpoint,
  BulkSnippetsEndpoint,
  DocumentsListEndpoint,
  KnowledgeSnippetsListEndpoint,
  DocumentSchema,
  KnowledgeSnippetSchema,
  DocumentStatusSchema,
  DocumentStatus,
} from "../models/documents.js";
import { Tag, TagSchema } from "../models/tags.js";
import { ErrorSchema } from "../models/shared.js";
import { getAuth } from "@clerk/fastify";

// S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const getBucketName = () => {
  const environment = process.env.ENVIRONMENT ?? "development";
  return `clancy-documents-${environment}`;
};

export async function documentsRoutes(app: FastifyTypeBox) {
  app.addSchema(DocumentSchema);
  app.addSchema(KnowledgeSnippetSchema);
  app.addSchema(ErrorSchema);
  app.addSchema(TagSchema);
  app.addSchema(DocumentStatusSchema);

  app.post(
    "/documents/presign",
    {
      schema: DocumentPresignEndpoint,
    },
    async (request, reply) => {
      const {
        filename,
        mimeType,
        sizeBytes,
        ownershipScope = "organization",
        ownerId,
      } = request.body as DocumentPresignRequest;

      const { orgId, userId } = getAuth(request);
      if (!orgId || !userId) {
        return reply.status(401).send({
          message: "Authentication required",
          error: "Unauthorized",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      const documentId = randomUUID();
      const key = `org/${orgId}/documents/${documentId}/original/${filename}`;
      const bucketName = getBucketName();

      try {
        // Generate presigned URL
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          ContentType: mimeType,
          ContentLength: sizeBytes,
        });

        const uploadUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 900,
        }); // 15 minutes

        // Create document record
        await app.db.insert(documentStore).values({
          orgId,
          documentId,
          documentType: mimeType,
          documentUri: `s3://${bucketName}/${key}`,
          title: filename,
          mimeType,
          sizeBytes: sizeBytes.toString(),
          uploaderUserId: userId,
          ownershipScope: ownershipScope as "user" | "organization",
          ownerId:
            ownerId ?? (ownershipScope === "organization" ? orgId : userId),
          status: DocumentStatus.Registered,
        });

        return reply.status(200).send({
          uploadUrl,
          key,
          documentId,
        });
      } catch (error) {
        app.log.error("Error generating presigned URL:", error);
        return reply.status(500).send({
          message: "Failed to generate upload URL",
          error: "Internal server error",
          statusCode: 500,
        });
      }
    },
  );

  // POST /documents/finalize - Mark document as uploaded and ready for processing
  app.post(
    "/documents/finalize",
    {
      schema: DocumentFinalizeEndpoint,
    },
    async (request, reply) => {
      const { documentId, key } = request.body as DocumentFinalizeRequest;

      const { orgId, userId } = getAuth(request);
      if (!orgId || !userId) {
        return reply.status(401).send({
          message: "Authentication required",
          error: "Unauthorized",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        // Update document status with ownership check
        const result = await app.db
          .update(documentStore)
          .set({
            status: DocumentStatus.Uploaded,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(documentStore.documentId, documentId),
              eq(documentStore.orgId, orgId),
            ),
          )
          .returning({ id: documentStore.id });

        if (result.length === 0) {
          return reply.status(404).send({
            message: `Document with ID ${documentId} not found or access denied`,
            error: "Document not found",
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }

        // Note: In production, this would trigger Lambda via S3 event
        // For now, we just mark as uploaded
        return reply.status(200).send({
          status: "uploaded",
          message: "Document uploaded successfully and queued for processing",
        });
      } catch (error) {
        app.log.error("Error finalizing document:", error);
        return reply.status(500).send({
          message: "Failed to finalize document upload",
          error: "Internal server error",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // GET /documents/:documentId/status - Get document processing status
  app.get(
    "/documents/:documentId/status",
    {
      schema: DocumentStatusEndpoint,
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const doc = await app.db.query.documentStore.findFirst({
          where: and(
            eq(documentStore.documentId, documentId),
            eq(documentStore.orgId, orgId),
          ),
        });

        if (!doc) {
          return reply.status(404).send({
            message: `Document with ID ${documentId} not found or access denied`,
            error: "Document not found",
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }

        return reply.status(200).send({
          documentId: doc.documentId,
          status: doc.status,
          title: doc.title ?? undefined,
          mimeType: doc.mimeType ?? undefined,
          sizeBytes: doc.sizeBytes ?? undefined,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        });
      } catch (error) {
        app.log.error("Error fetching document status:", error);
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to fetch document status",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // GET /documents/:documentId - Get document details by ID
  app.get(
    "/documents/:documentId",
    {
      schema: DocumentGetEndpoint,
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const doc = await app.db.query.documentStore.findFirst({
          where: and(
            eq(documentStore.documentId, documentId),
            eq(documentStore.orgId, orgId),
          ),
          with: {
            documentTags: {
              with: {
                tag: true,
              },
            },
          },
        });

        if (!doc) {
          return reply.status(404).send({
            message: `Document with ID ${documentId} not found or access denied`,
            error: "Document not found",
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }

        // Transform the response to match the Document schema
        const documentResponse = {
          id: doc.id,
          orgId: doc.orgId,
          documentId: doc.documentId,
          documentType: doc.documentType || "",
          documentUri: doc.documentUri || "",
          title: doc.title || "",
          mimeType: doc.mimeType || "",
          sizeBytes: doc.sizeBytes || "",
          uploaderUserId: doc.uploaderUserId,
          ownershipScope: doc.ownershipScope,
          ownerId: doc.ownerId,
          status: doc.status,
          tags: doc.documentTags.map((dt) => ({
            id: dt.tag.id,
            orgId: dt.tag.orgId,
            name: dt.tag.name,
            createdAt: dt.tag.createdAt.toISOString(),
            updatedAt: dt.tag.updatedAt.toISOString(),
          })),
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        };

        return reply.status(200).send(documentResponse);
      } catch (error) {
        app.log.error("Error fetching document:", error);
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to fetch document",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // GET /documents/:documentId/download - Get presigned download URL
  app.get(
    "/documents/:documentId/download",
    {
      schema: DocumentDownloadEndpoint,
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const doc = await app.db.query.documentStore.findFirst({
          where: and(
            eq(documentStore.documentId, documentId),
            eq(documentStore.orgId, orgId),
          ),
        });

        if (!doc) {
          return reply.status(404).send({
            message: `Document with ID ${documentId} not found or access denied`,
            error: "Document not found",
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }

        // Extract S3 key from document URI (format: s3://bucket/key)
        if (!doc.documentUri?.startsWith("s3://")) {
          return reply.status(400).send({
            message: "Document URI is not a valid S3 URI",
            error: "Invalid document URI",
            statusCode: 400,
            timestamp: new Date().toISOString(),
          });
        }

        const s3Uri = doc.documentUri.replace("s3://", "");
        const [bucket, ...keyParts] = s3Uri.split("/");
        const key = keyParts.join("/");

        // Generate presigned download URL
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });

        const expiresIn = 3600; // 1 hour
        const downloadUrl = await getSignedUrl(s3Client, command, {
          expiresIn,
        });

        // Extract filename from key (last part after final slash)
        const filename = key.split("/").pop() || doc.title || "download";

        return reply.status(200).send({
          downloadUrl,
          filename,
          mimeType: doc.mimeType ?? undefined,
          sizeBytes: doc.sizeBytes ?? undefined,
          expiresIn,
        });
      } catch (error) {
        app.log.error("Error generating download URL:", error);
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to generate download URL",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // DELETE /documents/:documentId - Delete document and all related data
  app.delete(
    "/documents/:documentId",
    {
      schema: DocumentDeleteEndpoint,
    },
    async (request, reply) => {
      const { documentId } = request.params as { documentId: string };

      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        // First, fetch the document to get the S3 URI and verify ownership
        const doc = await app.db.query.documentStore.findFirst({
          where: and(
            eq(documentStore.documentId, documentId),
            eq(documentStore.orgId, orgId),
          ),
        });

        if (!doc) {
          return reply.status(404).send({
            message: `Document with ID ${documentId} not found or access denied`,
            error: "Document not found",
            statusCode: 404,
            timestamp: new Date().toISOString(),
          });
        }

        // Extract S3 key from document URI for deletion
        let s3Key: string | null = null;
        let s3Bucket: string | null = null;

        if (doc.documentUri && doc.documentUri.startsWith("s3://")) {
          const s3Uri = doc.documentUri.replace("s3://", "");
          const [bucket, ...keyParts] = s3Uri.split("/");
          s3Bucket = bucket || null;
          s3Key = keyParts.join("/");
        }

        // Delete from database first (in a transaction)
        await app.db.transaction(async (tx) => {
          // Delete associated knowledge snippets first
          await tx
            .delete(knowledgeSnippets)
            .where(
              and(
                eq(knowledgeSnippets.documentId, documentId),
                eq(knowledgeSnippets.orgId, orgId),
              ),
            );

          // Delete document tags
          await tx
            .delete(documentTags)
            .where(
              and(
                eq(documentTags.documentId, doc.id),
                eq(documentTags.orgId, orgId),
              ),
            );

          // Delete the document itself
          await tx
            .delete(documentStore)
            .where(
              and(
                eq(documentStore.documentId, documentId),
                eq(documentStore.orgId, orgId),
              ),
            );
        });

        // Delete from S3 if we have valid S3 info
        if (s3Key && s3Bucket) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: s3Bucket,
              Key: s3Key,
            });
            await s3Client.send(deleteCommand);
            app.log.info("Successfully deleted document from S3", {
              bucket: s3Bucket,
              key: s3Key,
              documentId,
            });
          } catch (s3Error) {
            app.log.warn(
              "Failed to delete document from S3, but database deletion succeeded",
              {
                bucket: s3Bucket,
                key: s3Key,
                documentId,
                error: s3Error,
              },
            );
            // Continue - database deletion succeeded, which is more important
          }
        } else {
          app.log.warn("No valid S3 URI found for document", {
            documentId,
            documentUri: doc.documentUri,
          });
        }

        return reply.status(200).send({
          message: "Document and all related data deleted successfully",
          documentId,
        });
      } catch (error) {
        app.log.error("Error deleting document:", error);
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to delete document",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // POST /documents/ingestion-complete - Mark ingestion as complete (Lambda endpoint)
  app.post(
    "/documents/ingestion-complete",
    {
      schema: DocumentIngestionCompleteEndpoint,
    },
    async (request, reply) => {
      const { documentId, status, error, metadata } = request.body;

      try {
        await app.db
          .update(documentStore)
          .set({
            status,
            updatedAt: new Date(),
          })
          .where(eq(documentStore.documentId, documentId));

        if (metadata) {
          // Could store additional metadata in document_store or separate table
          app.log.info("Ingestion metadata:", { documentId, metadata });
        }

        if (error) {
          app.log.error("Ingestion failed:", { documentId, error });
        }

        return reply.status(200).send({ status: DocumentStatus.Completed });
      } catch (dbError) {
        app.log.error("Error updating ingestion status:", dbError);
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to update ingestion status",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // POST /knowledge_snippets/bulk - Bulk insert knowledge snippets (Lambda endpoint)
  app.post(
    "/knowledge_snippets/bulk",
    {
      schema: BulkSnippetsEndpoint,
    },
    async (request, reply) => {
      const { orgId, documentId, ownershipScope, ownerId, snippets } =
        request.body as BulkSnippetsRequest;

      try {
        let inserted = 0;
        let duplicates = 0;

        // Insert snippets in batches to avoid large transactions
        const batchSize = 50;
        for (let i = 0; i < snippets.length; i += batchSize) {
          const batch = snippets.slice(i, i + batchSize);

          const rows = batch.map((snippet) => ({
            orgId,
            documentId,
            origin: KnowledgeSnippetOrigin.USER_UPLOAD,
            ownershipScope: ownershipScope as "user" | "organization",
            ownerId:
              ownerId ??
              (ownershipScope === "organization" ? orgId : "unknown"),
            blob: snippet.blob,
            embedding: snippet.embedding,
            chunkIndex: snippet.chunkIndex,
            chunkCount: snippet.chunkCount,
            checksum: snippet.checksum,
            metadata: snippet.metadata ?? {},
          }));

          try {
            await app.db.insert(knowledgeSnippets).values(rows);
            inserted += rows.length;
          } catch (insertError) {
            // Handle constraint violations (duplicates)
            app.log.warn("Some snippets were duplicates:", {
              documentId,
              batchStart: i,
            });
            duplicates += rows.length;
          }
        }

        return reply.status(200).send({
          inserted,
          duplicates,
        });
      } catch (error) {
        app.log.error("Error bulk inserting snippets:", error);
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to bulk insert snippets",
          statusCode: 500,
        });
      }
    },
  );

  // GET /documents - List documents with filters
  app.get(
    "/documents",
    {
      schema: DocumentsListEndpoint,
    },
    async (request, reply) => {
      const query = request.query;
      const {
        scope,
        owner,
        type,
        dateFrom,
        dateTo,
        q,
        tags,
        page = 1,
        limit = 20,
      } = query;

      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      // Build filter conditions
      const conditions = [eq(documentStore.orgId, orgId)];

      if (scope) {
        conditions.push(eq(documentStore.ownershipScope, scope));
      }
      if (owner) {
        conditions.push(eq(documentStore.ownerId, owner));
      }
      if (type) {
        conditions.push(eq(documentStore.mimeType, type));
      }
      if (dateFrom) {
        conditions.push(gte(documentStore.createdAt, new Date(dateFrom)));
      }
      if (dateTo) {
        conditions.push(lte(documentStore.createdAt, new Date(dateTo)));
      }
      if (q) {
        // Text search on title and uploaderUserId (case-insensitive)
        const searchPattern = `%${q}%`;
        conditions.push(ilike(documentStore.title, searchPattern));
      }

      if (tags && tags.length > 0) {
        conditions.push(
          exists(
            app.db
              .select()
              .from(documentTags)
              .innerJoin(tagsTable, eq(documentTags.tagId, tagsTable.id))
              .where(
                and(
                  eq(documentTags.orgId, orgId),
                  sql`${documentTags.tagId}::text = ANY(${tags})`,
                ),
              ),
          ),
        );
      }
      const offset = (page - 1) * limit;

      const documents = await app.db.query.documentStore.findMany({
        where: and(...conditions),
        limit,
        offset,
        with: {
          documentTags: {
            with: {
              tag: true,
            },
          },
        },
      });

      const count = await app.db.$count(documentStore, and(...conditions));

      return reply.status(200).send({
        data: documents.map((doc) => {
          return {
            ...doc,
            tags: doc.documentTags.map((dt) => {
              return {
                ...dt.tag,
                createdAt: dt.tag.createdAt.toISOString(),
                updatedAt: dt.tag.updatedAt.toISOString(),
              };
            }),
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString(),
          };
        }),
        total: count,
        page,
        limit,
      });
    },
  );

  // GET /knowledge_snippets - List knowledge snippets with filters
  app.get(
    "/knowledge_snippets",
    {
      schema: KnowledgeSnippetsListEndpoint,
    },
    async (request, reply) => {
      const queryParams = request.query as KnowledgeSnippetsListQuery;
      const { scope, query, page = 1, limit = 20 } = queryParams;

      const { orgId } = getAuth(request);
      if (!orgId) {
        return reply.status(401).send({
          error: "Unauthorized",
          message: "No organization ID found",
          statusCode: 401,
          timestamp: new Date().toISOString(),
        });
      }

      try {
        // Build filter conditions
        const conditions = [eq(knowledgeSnippets.orgId, orgId)];

        if (scope) {
          conditions.push(eq(knowledgeSnippets.ownershipScope, scope));
        }
        if (query) {
          // Use ilike for case-insensitive text search
          conditions.push(ilike(knowledgeSnippets.blob, `%${query}%`));
        }

        const whereCondition =
          conditions.length > 1 ? and(...conditions) : conditions[0];

        // Get total count for pagination
        const countResult = await app.db
          .select({ total: count() })
          .from(knowledgeSnippets)
          .where(whereCondition);
        const total = countResult[0]?.total ?? 0;

        // Get paginated results
        const offset = (page - 1) * limit;
        const snippets = await app.db
          .select({
            id: knowledgeSnippets.id,
            orgId: knowledgeSnippets.orgId,
            sourceRunId: knowledgeSnippets.sourceRunId,
            origin: knowledgeSnippets.origin,
            summary: knowledgeSnippets.summary,
            blob: knowledgeSnippets.blob,
            metadata: knowledgeSnippets.metadata,
            ownershipScope: knowledgeSnippets.ownershipScope,
            ownerId: knowledgeSnippets.ownerId,
            documentId: knowledgeSnippets.documentId,
            chunkIndex: knowledgeSnippets.chunkIndex,
            chunkCount: knowledgeSnippets.chunkCount,
            checksum: knowledgeSnippets.checksum,
            createdAt: knowledgeSnippets.createdAt,
          })
          .from(knowledgeSnippets)
          .where(whereCondition)
          .orderBy(desc(knowledgeSnippets.createdAt))
          .limit(limit)
          .offset(offset);

        const formattedSnippets = snippets.map((snippet) => ({
          id: snippet.id,
          orgId: snippet.orgId,
          sourceRunId: snippet.sourceRunId ?? undefined,
          origin: snippet.origin,
          summary: snippet.summary ?? undefined,
          blob: snippet.blob ?? undefined,
          metadata: snippet.metadata,
          ownershipScope: snippet.ownershipScope ?? undefined,
          ownerId: snippet.ownerId ?? undefined,
          documentId: snippet.documentId ?? undefined,
          chunkIndex: snippet.chunkIndex ?? undefined,
          chunkCount: snippet.chunkCount ?? undefined,
          checksum: snippet.checksum ?? undefined,
          createdAt: snippet.createdAt.toISOString(),
        }));

        return reply.status(200).send({
          data: formattedSnippets,
          total,
          page,
          limit,
        });
      } catch (error) {
        app.log.error("Error fetching knowledge snippets:", error);
        return reply.status(500).send({
          error: "Internal server error",
          message: "Failed to fetch knowledge snippets",
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );
}
