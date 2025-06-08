import { KinesisClient, PutRecordCommand } from '@aws-sdk/client-kinesis';
import { 
  EventBridgeEvent, 
  RunIntentEvent, 
  ResumeIntentEvent, 
  KinesisEventPayload,
  LambdaEvent 
} from './types.js';

// Initialize Kinesis client
const kinesisClient = new KinesisClient({ region: process.env.AWS_REGION });

/**
 * Parse EventBridge event to extract the detail payload
 */
export function parseEventBridgeEvent(event: any): LambdaEvent {
  if (!event.detail) {
    throw new Error('Invalid EventBridge event: missing detail');
  }
  
  return event as LambdaEvent;
}

/**
 * Validate RunIntent event structure
 */
export function isRunIntentEvent(detail: any): detail is RunIntentEvent {
  return detail.eventType === 'run_intent' && 
         detail.runId && 
         detail.agentId && 
         detail.orgId;
}

/**
 * Validate ResumeIntent event structure
 */
export function isResumeIntentEvent(detail: any): detail is ResumeIntentEvent {
  return detail.eventType === 'resume_intent' && 
         detail.runId && 
         detail.agentId && 
         detail.orgId &&
         detail.hilResponse;
}

/**
 * Publish event to Kinesis stream
 */
export async function publishToKinesis(payload: KinesisEventPayload): Promise<void> {
  const streamName = process.env.KINESIS_STREAM_NAME;
  if (!streamName) {
    throw new Error('KINESIS_STREAM_NAME environment variable not set');
  }

  const data = new TextEncoder().encode(JSON.stringify(payload));

  const command = new PutRecordCommand({
    StreamName: streamName,
    Data: data,
    PartitionKey: payload.runId, // Use runId for partitioning
  });

  try {
    await kinesisClient.send(command);
    console.log(`Published event to Kinesis: ${payload.eventType} for run ${payload.runId}`);
  } catch (error) {
    console.error('Failed to publish to Kinesis:', error);
    throw error;
  }
}

/**
 * Create a standardized Kinesis event payload
 */
export function createKinesisPayload(
  eventType: string,
  runId: string,
  agentId: string,
  orgId: string,
  status: KinesisEventPayload['status'],
  data?: Record<string, any>,
  error?: string
): KinesisEventPayload {
  return {
    eventType,
    runId,
    agentId,
    orgId,
    timestamp: new Date().toISOString(),
    status,
    data,
    error,
  };
}

/**
 * Extract configuration from environment variables
 */
export function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'dev',
    agentsCoreApiUrl: process.env.AGENTS_CORE_API_URL,
    connectHubApiUrl: process.env.CONNECT_HUB_API_URL,
    kinesisStreamName: process.env.KINESIS_STREAM_NAME,
  };
}

/**
 * Standard error handler for lambda functions
 */
export function handleLambdaError(error: any, context: string): never {
  console.error(`Error in ${context}:`, error);
  throw error;
} 