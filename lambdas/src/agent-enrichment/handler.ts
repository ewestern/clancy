import { Context } from 'aws-lambda';
import { Configuration, ApprovalsApi } from '@clancy/agents_core_sdk';
import {
  parseEventBridgeEvent,
  isRunIntentEvent,
  isResumeIntentEvent,
  publishToKinesis,
  createKinesisPayload,
  getConfig,
  handleLambdaError,
  RunIntentEvent,
  ResumeIntentEvent,
  AgentMetadata,
  EnrichedRunIntentEvent,
  EnrichedResumeIntentEvent,
} from '../shared/index.js';

/**
 * AgentEnrichment Lambda Handler
 * 
 * This lambda serves as an enrichment step in EventBridge pipes.
 * It receives RunIntent and ResumeIntent events, enriches them with
 * agent metadata from agents_core, and publishes enriched events to Kinesis.
 */
export const lambdaHandler = async (event: any, context: Context): Promise<any> => {
  console.log('AgentEnrichment lambda triggered:', JSON.stringify(event, null, 2));

  try {
    // Parse EventBridge event
    const eventBridgeEvent = parseEventBridgeEvent(event);
    const { detail } = eventBridgeEvent;

    // Get configuration
    const config = getConfig();
    if (!config.agentsCoreApiUrl) {
      throw new Error('AGENTS_CORE_API_URL environment variable not set');
    }

    // Validate event type
    if (!isRunIntentEvent(detail) && !isResumeIntentEvent(detail)) {
      throw new Error(`Unsupported event type: ${(detail as any).eventType}`);
    }

    // Initialize agents_core SDK
    const agentsCoreConfig = new Configuration({
      basePath: config.agentsCoreApiUrl,
    });
    const approvalsApi = new ApprovalsApi(agentsCoreConfig);

    // Retrieve agent metadata
    console.log(`Retrieving agent metadata for agent: ${detail.agentId}`);
    const agentMetadata = await retrieveAgentMetadata(detail.agentId, approvalsApi);

    // Create enriched event
    let enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent;

    if (isRunIntentEvent(detail)) {
      enrichedEvent = {
        ...detail,
        agentMetadata,
      } as EnrichedRunIntentEvent;
    } else {
      enrichedEvent = {
        ...detail,
        agentMetadata,
      } as EnrichedResumeIntentEvent;
    }

    // Publish enriched event to Kinesis
    const kinesisPayload = createKinesisPayload(
      `enriched_${detail.eventType}`,
      detail.runId,
      detail.agentId,
      detail.orgId,
      'started',
      { enrichedEvent }
    );

    await publishToKinesis(kinesisPayload);

    console.log(`Successfully enriched and published event for run: ${detail.runId}`);

    // Return enriched event for EventBridge pipe to continue processing
    return enrichedEvent;

  } catch (error) {
    handleLambdaError(error, 'AgentEnrichment');
  }
};

/**
 * Retrieve agent metadata from agents_core
 * Note: This is a placeholder implementation. In reality, you would call
 * an appropriate API endpoint to get agent metadata.
 */
async function retrieveAgentMetadata(
  agentId: string, 
  approvalsApi: ApprovalsApi
): Promise<AgentMetadata> {
  try {
    // TODO: Replace with actual agents_core API call to get agent metadata
    // For now, return mock metadata
    const mockMetadata: AgentMetadata = {
      agentId,
      name: `Agent ${agentId}`,
      description: `Agent description for ${agentId}`,
      type: 'digital_employee',
      capabilities: ['email_processing', 'knowledge_retrieval'],
      config: {
        maxTokens: 4000,
        temperature: 0.7,
      },
    };

    console.log(`Retrieved agent metadata:`, mockMetadata);
    return mockMetadata;

  } catch (error) {
    console.error(`Failed to retrieve agent metadata for ${agentId}:`, error);
    
    // Return minimal metadata if retrieval fails
    return {
      agentId,
      name: 'Unknown Agent',
      description: 'Agent metadata could not be retrieved',
      type: 'digital_employee',
      capabilities: [],
      config: {},
    };
  }
} 