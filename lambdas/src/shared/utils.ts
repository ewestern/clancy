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

  console.log(
    "Publishing event to Kinesis:",
    JSON.stringify(correctedPayload, null, 2)
  );
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
    cognitoClientId: process.env.COGNITO_CLIENT_ID,
    cognitoClientSecret: process.env.COGNITO_CLIENT_SECRET,
    cognitoDomain: process.env.COGNITO_DOMAIN,
  };
}

/**
 * Request M2M access token from Cognito using client credentials flow
 */
export interface CognitoTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export async function requestCognitoM2MToken(): Promise<CognitoTokenResponse> {
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  const cognitoDomain = process.env.COGNITO_DOMAIN;

  if (!clientId || !clientSecret || !cognitoDomain) {
    throw new Error(
      "Missing required environment variables: COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET, or COGNITO_DOMAIN"
    );
  }

  const tokenEndpoint = `https://${cognitoDomain}.auth.us-east-1.amazoncognito.com/oauth2/token`;

  // Prepare the request body for client credentials flow
  const requestBody = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://clancyai.com/all",
  });

  // Create Basic Auth header with client credentials
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: requestBody.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to request token: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const tokenData: CognitoTokenResponse = await response.json();

    console.log("Successfully obtained M2M token", {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
    });

    return tokenData;
  } catch (error) {
    console.error("Error requesting Cognito M2M token:", error);
    throw error;
  }
}

/**
 * Get authorization header with fresh M2M token
 */
export async function getAuthorizationHeader(): Promise<string> {
  const tokenResponse = await requestCognitoM2MToken();
  return `${tokenResponse.token_type} ${tokenResponse.access_token}`;
}

/**
 * Standard error handler for lambda functions
 */
export function handleLambdaError(error: any, context: string): never {
  console.error(`Error in ${context}:`, error);
  throw error;
}
