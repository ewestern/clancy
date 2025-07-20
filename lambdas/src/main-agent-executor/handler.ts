import { Context } from "aws-lambda";
import { Configuration, CapabilitiesApi } from "@clancy/connect_hub_sdk";
import {
  parseEventBridgeEvent,
  getEnv,
  handleLambdaError,
} from "../shared/index.js";
import { RunIntentEvent, ResumeIntentEvent } from "@ewestern/events";

interface KinesisEvent {
  data: RunIntentEvent | ResumeIntentEvent;
}

/**
 * MainAgentExecutor Lambda Handler
 *
 * This lambda handles execution of general agent workflows (non-graph-creator).
 * It receives enriched events from EventBridge and executes agent workflows
 * using connect_hub capabilities.
 */
export const lambdaHandler = async (
  event: any,
  context: Context
): Promise<void> => {
  console.log(
    "MainAgentExecutor lambda triggered:",
    JSON.stringify(event, null, 2)
  );

  try {
    // Parse EventBridge event
    const eventBridgeEvent = parseEventBridgeEvent(event);
    const { detail } = eventBridgeEvent;

    // Get configuration
    const env = getEnv();

    // Validate event type and extract data

    // Initialize connect_hub SDK
    const connectHubConfig = new Configuration({
      basePath: env.connectHubApiUrl,
    });
    const capabilitiesApi = new CapabilitiesApi(connectHubConfig);
  } catch (error) {
    console.error("Error in MainAgentExecutor:", error);

    handleLambdaError(error, "MainAgentExecutor");
  }
};
