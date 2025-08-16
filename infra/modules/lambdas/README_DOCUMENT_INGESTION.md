# Document Ingestion Infrastructure

This document describes the Terraform infrastructure added to support serverless document ingestion for Clancy's knowledge store.

## Architecture Overview

```
User Upload → S3 Presigned URL → S3 Bucket → S3 Event → Lambda Function → ConnectHub API
```

## Resources Created

### S3 Bucket (`aws_s3_bucket.documents`)
- **Name**: `${project_name}-documents-${environment}` (e.g., `clancy-documents-staging`)
- **Purpose**: Store uploaded documents before processing
- **Structure**: `org/{orgId}/documents/{documentId}/original/{filename}`
- **Features**:
  - Versioning enabled
  - Server-side encryption (AES256)
  - Lifecycle policy (STANDARD → IA after 30 days → Glacier after 90 days)
  - Public access blocked
  - Event notifications for S3 ObjectCreated events

### Document Ingestion Lambda (`aws_lambda_function.document_ingest`)
- **Name**: `${project_name}-${environment}-document-ingest`
- **Runtime**: Node.js 22.x
- **Memory**: 1024 MB (configurable via `document_ingest_memory_size`)
- **Timeout**: 900 seconds / 15 minutes (configurable via `document_ingest_timeout`)
- **Trigger**: S3 ObjectCreated events for objects with `org/` prefix
- **Handler**: `handler.handler`

### IAM Roles and Policies

#### Document Ingest Role (`aws_iam_role.document_ingest_role`)
- **Attached Policies**:
  - `AWSLambdaBasicExecutionRole` (CloudWatch logs)
  - `AWSLambdaVPCAccessExecutionRole` (if VPC enabled)
  - Custom S3 access policy

#### S3 Access Policy (`aws_iam_role_policy.document_ingest_s3_access`)
- **Permissions**:
  - `s3:GetObject` and `s3:GetObjectVersion` on bucket objects
  - `s3:ListBucket` on the bucket itself
- **Scope**: Limited to the documents bucket only

### CloudWatch Log Group
- **Name**: `/aws/lambda/${function_name}`
- **Retention**: Configurable via `log_retention_days` (default: 14 days)

### S3 Event Notification
- **Trigger**: S3 ObjectCreated:* events
- **Filter**: Objects with `org/` prefix (matches document key structure)
- **Target**: Document ingestion Lambda function

## Environment Variables

The Lambda function receives these environment variables:

- `NODE_ENV`: Environment (dev/staging/prod)
- `CONNECT_HUB_API_URL`: Base URL for ConnectHub API
- `DOCUMENTS_BUCKET_NAME`: S3 bucket name for document storage
- `CONNECT_HUB_AUTH_TOKEN`: Authentication token for Lambda→ConnectHub calls
- `OPENAI_API_KEY`: OpenAI API key for embeddings generation
- `KINESIS_STREAM_NAME`: Kinesis stream for event publishing (inherited)
- `AGENTS_CORE_API_URL`: Agents Core API URL (inherited)
- `ANTHROPIC_API_KEY`: Anthropic API key (inherited)
- `CHECKPOINTER_DB_URL`: Checkpointer database URL (inherited)

## Processing Flow

1. **Document Upload**: User uploads file to S3 using presigned URL from ConnectHub
2. **S3 Event**: S3 ObjectCreated event triggers Lambda function
3. **Text Extraction**: Lambda downloads file and extracts text (PDF, DOCX, or plain text)
4. **Chunking**: Text split into 1000-character chunks with 200-character overlap
5. **Embedding**: OpenAI text-embedding-3-small generates 1536-dimensional vectors
6. **Storage**: Lambda calls ConnectHub `/knowledge_snippets/bulk` to store chunks
7. **Completion**: Lambda calls ConnectHub `/documents/ingestion-complete` to mark status

## Supported File Types

- **PDF**: `application/pdf` (via `pdf-parse` library)
- **DOCX**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (via `mammoth` library)
- **Plain Text**: `text/plain` (native Node.js)

## File Size and Processing Limits

- **Maximum file size**: 10 MB (enforced by ConnectHub presign endpoint)
- **Maximum chunks**: 5000 per document (prevents embedding cost explosions)
- **Lambda timeout**: 15 minutes (sufficient for large document processing)
- **Lambda memory**: 1 GB (adequate for PDF/DOCX parsing)

## Deployment Variables

When calling this module, provide:

```hcl
module "lambdas" {
  source = "../../modules/lambdas"
  
  # ... existing variables ...
  
  # Document ingestion specific (optional - have defaults)
  document_ingest_timeout     = 900   # 15 minutes
  document_ingest_memory_size = 1024  # 1 GB
}
```

## Module Outputs

New outputs added:

- `document_ingest_function_arn`: ARN of the document ingestion Lambda
- `document_ingest_function_name`: Name of the document ingestion Lambda
- `documents_bucket_name`: Name of the S3 documents bucket
- `documents_bucket_arn`: ARN of the S3 documents bucket

Updated outputs:
- `function_arns`: Now includes `document_ingest`
- `function_names`: Now includes `document_ingest`

## Security Considerations

### IAM Permissions
- Lambda has minimal S3 permissions (read-only on documents bucket)
- No cross-bucket access or public bucket permissions
- ConnectHub auth token should be replaced with proper Cognito M2M JWT

### Network Security
- Lambda can be deployed in VPC if `vpc_subnet_ids` provided
- S3 bucket blocks all public access
- All traffic encrypted in transit (HTTPS/TLS)

### Data Protection
- S3 server-side encryption enabled
- Document versioning for accidental deletion protection
- Lifecycle policies for cost optimization

## Monitoring and Observability

### CloudWatch Logs
- Function logs sent to `/aws/lambda/${function_name}`
- Structured logging with document IDs and processing metadata
- Error details and stack traces for debugging

### Metrics (Available via CloudWatch)
- Lambda invocation count and duration
- Error rate and success rate
- Memory utilization and timeouts
- S3 event processing latency

### Recommended Alarms
- Lambda error rate > 5%
- Lambda duration > 10 minutes (approaching timeout)
- S3 bucket upload failures
- ConnectHub API call failures

## Cost Estimation

### S3 Storage
- ~$0.023/GB/month for Standard storage
- Lifecycle transitions reduce long-term costs

### Lambda Compute
- ~$0.0000166667/GB-second for compute time
- 1 GB memory × 60 seconds × $0.0000166667 ≈ $0.001 per document

### OpenAI Embeddings
- ~$0.10 per 1M tokens (~750k words)
- Average document (10k words) ≈ $0.0013 in embedding costs

### Total Cost Example
- 1000 documents/month × 50KB average = 50 MB storage ≈ $0.001
- 1000 documents × $0.001 Lambda + $0.0013 OpenAI ≈ $2.30/month

## Troubleshooting

### Common Issues

1. **Lambda timeout**: Increase `document_ingest_timeout` for large documents
2. **Memory errors**: Increase `document_ingest_memory_size` for complex PDFs
3. **S3 permissions**: Check IAM role has `s3:GetObject` on bucket
4. **ConnectHub auth**: Verify `CONNECT_HUB_AUTH_TOKEN` is configured
5. **Missing dependencies**: Ensure `pdf-parse` and `mammoth` are in package.json

### Debug Steps

1. Check CloudWatch logs for error details
2. Verify S3 event notification configuration
3. Test Lambda function with sample S3 event
4. Validate ConnectHub endpoints are accessible
5. Monitor OpenAI API quota and rate limits

## Future Enhancements

1. **Dead Letter Queue**: Add SQS DLQ for failed processing
2. **Batch Processing**: Process multiple files in single invocation
3. **Format Support**: Add support for more file types (images, presentations)
4. **Content Analysis**: Add content classification and PII detection
5. **Monitoring Dashboard**: Create CloudWatch dashboard for operational visibility