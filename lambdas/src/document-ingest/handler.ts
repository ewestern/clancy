import { S3Event, S3Handler } from "aws-lambda";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { OpenAIEmbeddings } from "@langchain/openai";
import { CharacterTextSplitter } from "@langchain/textsplitters";
import * as crypto from "crypto";

// Import PDF and DOCX extraction libraries
import * as pdfParse from "pdf-parse";
import * as mammoth from "mammoth";

interface ConnectHubConfig {
  baseUrl: string;
  authToken: string;
}

interface DocumentChunk {
  chunkIndex: number;
  chunkCount: number;
  blob: string;
  embedding: number[];
  checksum: string;
  metadata: Record<string, unknown>;
}

interface BulkSnippetsRequest {
  orgId: string;
  documentId: string;
  ownershipScope: "user" | "organization";
  ownerId?: string;
  snippets: DocumentChunk[];
}

interface IngestionCompleteRequest {
  documentId: string;
  status: "completed" | "failed";
  error?: string;
  metadata?: {
    pageCount?: number;
    textBytes?: number;
    extractionLib?: string;
    checksum?: string;
  };
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const connectHubConfig: ConnectHubConfig = {
  baseUrl: process.env.CONNECT_HUB_BASE_URL || "http://localhost:3001",
  authToken: process.env.CONNECT_HUB_AUTH_TOKEN || "lambda-secret",
};

/**
 * Extract text from various file formats
 */
async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
  let text = "";
  const metadata: Record<string, unknown> = { extractionLib: "unknown" };

  try {
    switch (mimeType) {
      case "application/pdf":
        const pdfData = await pdfParse.default(buffer);
        text = pdfData.text;
        metadata.pageCount = pdfData.numpages;
        metadata.extractionLib = "pdf-parse";
        break;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        const docxResult = await mammoth.extractRawText({ buffer });
        text = docxResult.value;
        metadata.extractionLib = "mammoth";
        break;

      case "text/plain":
        text = buffer.toString("utf-8");
        metadata.extractionLib = "native";
        break;

      default:
        throw new Error(`Unsupported MIME type: ${mimeType}`);
    }

    metadata.textBytes = Buffer.byteLength(text, "utf-8");
    return { text, metadata };
  } catch (error) {
    console.error("Text extraction failed:", error);
    throw new Error(`Failed to extract text from ${filename}: ${error}`);
  }
}

/**
 * Chunk text into overlapping segments
 */
async function chunkText(text: string): Promise<string[]> {
  const splitter = new CharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  return await splitter.splitText(text);
}

/**
 * Generate embeddings for text chunks
 */
async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  return await embeddings.embedDocuments(chunks);
}

/**
 * Calculate SHA256 checksum for a text chunk
 */
function calculateChecksum(text: string): string {
  return crypto.createHash("sha256").update(text, "utf-8").digest("hex");
}

/**
 * Parse S3 key to extract metadata
 */
function parseS3Key(key: string): {
  orgId: string;
  documentId: string;
  filename: string;
} {
  // Expected format: org/{orgId}/documents/{documentId}/original/{filename}
  const parts = key.split("/");
  if (
    parts.length < 5 ||
    parts[0] !== "org" ||
    parts[2] !== "documents" ||
    parts[4] !== "original"
  ) {
    throw new Error(`Invalid S3 key format: ${key}`);
  }

  return {
    orgId: parts[1],
    documentId: parts[3],
    filename: parts[5],
  };
}

/**
 * Send bulk snippets to ConnectHub
 */
async function sendBulkSnippets(request: BulkSnippetsRequest): Promise<void> {
  const response = await fetch(
    `${connectHubConfig.baseUrl}/knowledge_snippets/bulk`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connectHubConfig.authToken}`,
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ConnectHub bulk insert failed: ${response.status} ${errorText}`
    );
  }

  const result = await response.json();
  console.log("Bulk insert result:", result);
}

/**
 * Mark ingestion as complete in ConnectHub
 */
async function markIngestionComplete(
  request: IngestionCompleteRequest
): Promise<void> {
  const response = await fetch(
    `${connectHubConfig.baseUrl}/documents/ingestion-complete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connectHubConfig.authToken}`,
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ConnectHub ingestion-complete failed: ${response.status} ${errorText}`
    );
  }
}

/**
 * Process a single S3 object
 */
async function processDocument(bucket: string, key: string): Promise<void> {
  console.log(`Processing document: s3://${bucket}/${key}`);

  try {
    // Parse S3 key to extract metadata
    const { orgId, documentId, filename } = parseS3Key(key);

    // Download object from S3
    const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getObjectCommand);

    if (!response.Body) {
      throw new Error("No object body received from S3");
    }

    // Convert stream to buffer
    const buffer = Buffer.from(await response.Body.transformToByteArray());
    const mimeType = response.ContentType || "application/octet-stream";

    console.log(
      `Document metadata: ${filename}, ${mimeType}, ${buffer.length} bytes`
    );

    // Extract text
    const { text, metadata: extractionMetadata } = await extractText(
      buffer,
      mimeType,
      filename
    );

    if (!text || text.trim().length === 0) {
      throw new Error("No text content extracted from document");
    }

    // Chunk text
    const chunks = await chunkText(text);
    console.log(`Generated ${chunks.length} text chunks`);

    // Generate embeddings
    const embeddings = await generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings`);

    // Prepare snippets
    const snippets: DocumentChunk[] = chunks.map((chunk, index) => ({
      chunkIndex: index,
      chunkCount: chunks.length,
      blob: chunk,
      embedding: embeddings[index]!,
      checksum: calculateChecksum(chunk),
      metadata: {
        filename,
        chunkSize: chunk.length,
        ...extractionMetadata,
      },
    }));

    // Send to ConnectHub
    await sendBulkSnippets({
      orgId,
      documentId,
      ownershipScope: "organization", // Default for MVP
      snippets,
    });

    // Mark as complete
    await markIngestionComplete({
      documentId,
      status: "completed",
      metadata: {
        ...extractionMetadata,
        checksum: calculateChecksum(text),
      },
    });

    console.log(`Successfully processed document ${documentId}`);
  } catch (error) {
    console.error("Document processing failed:", error);

    // Try to extract documentId for error reporting
    let documentId: string | undefined;
    try {
      documentId = parseS3Key(key).documentId;
    } catch {
      // If we can't parse the key, we can't report back to ConnectHub
      console.error(
        "Could not extract documentId from key for error reporting"
      );
      throw error;
    }

    // Report failure to ConnectHub
    if (documentId) {
      try {
        await markIngestionComplete({
          documentId,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      } catch (reportError) {
        console.error("Failed to report error to ConnectHub:", reportError);
      }
    }

    throw error;
  }
}

/**
 * Lambda handler for S3 events
 */
export const handler: S3Handler = async (event: S3Event) => {
  console.log("Received S3 event:", JSON.stringify(event, null, 2));

  const promises = event.Records.map(async (record) => {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    // Only process files in the 'original' directory
    if (!key.includes("/original/")) {
      console.log(`Skipping file not in original directory: ${key}`);
      return;
    }

    return processDocument(bucket, key);
  });

  try {
    await Promise.all(promises);
    console.log("All documents processed successfully");
  } catch (error) {
    console.error("Some documents failed to process:", error);
    throw error; // This will trigger Lambda's error handling and DLQ if configured
  }
};
