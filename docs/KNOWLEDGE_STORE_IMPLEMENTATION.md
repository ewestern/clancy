# Knowledge Store Implementation

## Overview

This document describes the serverless knowledge ingestion system implemented for Clancy's unified semantic organizational memory. The system supports both agent-generated knowledge snippets and user-uploaded documents with chunking and vector embeddings.

## Architecture

```
User Upload Flow:
1. UI calls POST /documents/presign → ConnectHub returns S3 presigned URL
2. UI uploads file directly to S3
3. UI calls POST /documents/finalize → ConnectHub marks as uploaded
4. S3 event triggers document-ingest Lambda
5. Lambda extracts text, chunks, embeds, and calls ConnectHub bulk endpoints
6. UI polls GET /documents/:id/status until completed

Agent Knowledge Flow:
1. Agent calls /proxy/internal/knowledge.write during execution
2. ConnectHub chunks and embeds content, stores with sourceRunId
3. Later agents call /proxy/internal/knowledge.search for retrieval
```

## Schema Changes

### Extended `knowledge_snippets` Table
- **New fields**: `ownershipScope`, `ownerId`, `documentId`, `chunkIndex`, `chunkCount`, `checksum`
- **New enum value**: `USER_UPLOAD` origin for user-uploaded documents
- **New indexes**: Document-based and chunk-based lookups for efficient retrieval

### Extended `document_store` Table  
- **New fields**: `title`, `mimeType`, `sizeBytes`, `uploaderUserId`, `ownershipScope`, `ownerId`, `status`, timestamps
- **Status tracking**: `registered` → `uploaded` → `processing` → `completed`/`failed`

### New `ingestion_jobs` Table
- **Purpose**: Optional audit trail for async document processing
- **Fields**: Job metadata, S3 key, status, error details
- **Indexes**: Status and org/document lookups

## API Endpoints

### User-Facing Endpoints
- `POST /documents/presign` - Generate S3 presigned upload URL
- `POST /documents/finalize` - Mark document as uploaded  
- `GET /documents/:documentId/status` - Get processing status

### Internal Endpoints (Lambda)
- `POST /documents/ingestion-complete` - Mark processing complete/failed
- `POST /knowledge_snippets/bulk` - Bulk insert chunked snippets

### Existing Knowledge Endpoints (Extended)
- `POST /proxy/internal/knowledge.search` - Semantic search (now supports document filters)
- `POST /proxy/internal/knowledge.write` - Agent knowledge storage

## Lambda Implementation

### Document Ingestion Handler
- **Trigger**: S3 `ObjectCreated` events for `org/.../original/` prefix
- **Processing**: 
  1. Download and extract text (PDF via `pdf-parse`, DOCX via `mammoth`)
  2. Chunk with 1k character/200 overlap using LangChain TextSplitter
  3. Generate embeddings using OpenAI `text-embedding-3-small`
  4. POST chunks to ConnectHub `/knowledge_snippets/bulk`
  5. Mark ingestion complete via `/documents/ingestion-complete`
- **Error handling**: DLQ and status reporting to ConnectHub

## Configuration

### Environment Variables
- `CLANCY_DOCUMENTS_BUCKET`: S3 bucket name (format: `clancy-documents-${environment}`)
- `AWS_REGION`: AWS region for S3 and Lambda
- `OPENAI_API_KEY`: OpenAI API key for embeddings
- `CONNECT_HUB_BASE_URL`: ConnectHub API base URL
- `CONNECT_HUB_AUTH_TOKEN`: Lambda-to-ConnectHub authentication token

### S3 Bucket Structure
```
clancy-documents-${environment}/
└── org/${orgId}/
    └── documents/${documentId}/
        └── original/${filename}
```

### IAM Permissions
- **ConnectHub**: S3 presign permissions, object read access
- **Lambda**: S3 object read, ConnectHub API call permissions

## Security & Ownership

### MVP Approach
- All documents default to `ownershipScope: "organization"`
- Schema supports user/org/team scoping but enforcement deferred
- Org-level isolation via `orgId` filtering in all queries

### Future Enhancements
- Fine-grained permissions based on `ownershipScope` and `ownerId`
- Team-based access control when team entities are added
- PII classification and filtering

## Limits & Guardrails

### File Limits
- **Max size**: 10MB per document
- **Max chunks**: 5k per document (prevents embedding cost explosions)
- **Supported formats**: PDF, DOCX, plain text (extensible)

### Rate Limiting
- S3 presign URLs expire in 15 minutes
- Lambda timeout prevents runaway processing
- ConnectHub bulk insert uses 50-chunk batches

## Provider Sync (Fast-Follow)

### Google Drive Integration
- **Sync job**: Scheduled Lambda lists changed files using existing `google/drive.ts`
- **Pipeline**: Download → S3 upload → same ingestion Lambda
- **State**: Cursor tracking in `sync_sources` table or connection metadata
- **Filtering**: Respect Drive permissions and share settings

## Monitoring & Observability

### Metrics
- Document upload success/failure rates
- Ingestion processing time and throughput  
- Search query performance and result relevance
- Storage growth per organization

### Logging
- Structured logs with `documentId`, `orgId` correlation
- Text extraction success/failure with file metadata
- Embedding generation latency and token usage
- Search query patterns and result counts

## Migration Path

### Deployment Steps
1. **Schema**: Run `npm run db:generate` to create migration for new fields
2. **Dependencies**: Run `npm install` to add AWS S3 SDK
3. **ConnectHub**: Deploy updated service with document endpoints
4. **Lambda**: Package and deploy document-ingest function with S3 trigger
5. **S3**: Create bucket with event notification to Lambda
6. **UI**: Wire upload flow to new document endpoints

### Rollback Considerations
- New schema fields are optional/nullable - no breaking changes
- Document endpoints are net-new - can be disabled if needed
- Existing knowledge.search/write remain unchanged

## Cost Estimation

### Storage Costs
- **S3**: ~$0.023/GB/month for document storage
- **PostgreSQL**: Vector storage scales with chunk count
- **Estimated**: ~$10-50/month for 1000 documents (1GB total)

### Processing Costs  
- **Lambda**: ~$0.20 per 1GB-second of processing time
- **OpenAI Embeddings**: ~$0.10 per 1M tokens (~750k words)
- **Estimated**: ~$1-5 per 100 document ingestions

## Next Steps

1. **Complete PDF/DOCX extraction** - Add `pdf-parse` and `mammoth` dependencies to Lambda
2. **Auth integration** - Extract `orgId`/`userId` from Clerk JWT in ConnectHub routes  
3. **UI implementation** - Wire `KnowledgeExplorer` to real endpoints with upload flow
4. **Monitoring setup** - Add CloudWatch metrics and structured logging
5. **Google Drive sync** - Implement scheduled sync job as fast-follow feature