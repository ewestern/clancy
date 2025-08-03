import { KinesisClient, PutRecordCommand } from "@aws-sdk/client-kinesis";
import { LambdaEvent } from "./types.js";
import { Event } from "@ewestern/events";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

// Initialize Kinesis client
const kinesisClient = new KinesisClient({ region: process.env.AWS_REGION });

/**
 * Parse EventBridge event to extract the detail payload
 */
export function parseEventBridgeEvent(event: any): LambdaEvent {
  if (!event.detail) {
    throw new Error("Invalid EventBridge event: missing detail");
  }

  return event as LambdaEvent;
}

export function getCurrentTimestamp() {
  return dayjs().utc().format();
}

/**
 * Publish event to Kinesis stream
 */
export async function publishToKinesis(
  payload: Event,
  partitionKey: string
): Promise<void> {
  const streamName = process.env.KINESIS_STREAM_NAME;
  if (!streamName) {
    throw new Error("KINESIS_STREAM_NAME environment variable not set");
  }
  const correctedPayload = {
    ...payload,
    timestamp: getCurrentTimestamp(),
  };

  console.log("Publishing event to Kinesis:", JSON.stringify(correctedPayload, null, 2));
  const data = new TextEncoder().encode(JSON.stringify(correctedPayload));

  const command = new PutRecordCommand({
    StreamName: streamName,
    Data: data,
    PartitionKey: partitionKey,
  });

  try {
    await kinesisClient.send(command);
    console.log(`Published event to Kinesis: ${payload.type}`);
  } catch (error) {
    console.error("Failed to publish to Kinesis:", error);
    throw error;
  }
}

/**
 * Extract configuration from environment variables
 */
export function getEnv() {
  return {
    nodeEnv: process.env.NODE_ENV || "dev",
    agentsCoreApiUrl: process.env.AGENTS_CORE_API_URL,
    connectHubApiUrl: process.env.CONNECT_HUB_API_URL,
    kinesisStreamName: process.env.KINESIS_STREAM_NAME,
    checkpointerDbUrl: process.env.CHECKPOINTER_DB_URL,
    openaiApiKey: process.env.OPENAI_API_KEY,
  };
}

/**
 * Standard error handler for lambda functions
 */
export function handleLambdaError(error: any, context: string): never {
  console.error(`Error in ${context}:`, error);
  throw error;
}
