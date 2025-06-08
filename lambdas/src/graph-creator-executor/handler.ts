import { Context } from 'aws-lambda';
import { Configuration, CapabilitiesApi } from '@clancy/sdk';
import {
  parseEventBridgeEvent,
  isRunIntentEvent,
  isResumeIntentEvent,
  publishToKinesis,
  createKinesisPayload,
  getConfig,
  handleLambdaError,
  EnrichedRunIntentEvent,
  EnrichedResumeIntentEvent,
} from '../shared/index.js';
import { GraphCreator } from '../shared/graphCreator.js';

/**
 * GraphCreatorExecutor Lambda Handler
 * 
 * This lambda handles execution of graph creator agent workflows.
 * It receives enriched events from EventBridge and executes the 
 * graph creation process using connect_hub capabilities.
 */
export const lambdaHandler = async (event: any, context: Context): Promise<void> => {
  console.log('GraphCreatorExecutor lambda triggered:', JSON.stringify(event, null, 2));

  try {
    // Parse EventBridge event
    const eventBridgeEvent = parseEventBridgeEvent(event);
    const { detail } = eventBridgeEvent;

    // Get configuration
    const config = getConfig();
    if (!config.connectHubApiUrl) {
      throw new Error('CONNECT_HUB_API_URL environment variable not set');
    }

    // Validate event type and extract data
    let enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent;

    if (isRunIntentEvent(detail)) {
      enrichedEvent = detail as EnrichedRunIntentEvent;
    } else if (isResumeIntentEvent(detail)) {
      enrichedEvent = detail as EnrichedResumeIntentEvent;
    } else {
      throw new Error(`Unsupported event type: ${(detail as any).eventType}`);
    }

    // Validate that this is for graph creator
    if (!enrichedEvent.agentMetadata) {
      throw new Error('Missing agent metadata in enriched event');
    }

    // Initialize connect_hub SDK
    const connectHubConfig = new Configuration({
      basePath: config.connectHubApiUrl,
    });
    const capabilitiesApi = new CapabilitiesApi(connectHubConfig);

    // Publish run started event
    await publishRunStartedEvent(enrichedEvent);

    // Execute graph creator workflow
    console.log(`Executing graph creator workflow for run: ${enrichedEvent.runId}`);
    const result = await executeGraphCreatorWorkflow(enrichedEvent, capabilitiesApi);

    // Publish run completed event
    await publishRunCompletedEvent(enrichedEvent, result);

    console.log(`Successfully executed graph creator workflow for run: ${enrichedEvent.runId}`);

  } catch (error) {
    console.error('Error in GraphCreatorExecutor:', error);
    
    // Attempt to publish failure event if we have enough context
    if (event?.detail?.runId) {
      await publishRunFailedEvent(event.detail, error);
    }
    
    handleLambdaError(error, 'GraphCreatorExecutor');
  }
};

/**
 * Execute graph creator workflow using connect_hub capabilities
 */
async function executeGraphCreatorWorkflow(
  enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent,
  capabilitiesApi: CapabilitiesApi
): Promise<any> {
  const { agentMetadata } = enrichedEvent;

  console.log(`Executing graph creator for agent: ${agentMetadata.name}`);

  // Determine workflow type based on event
  if (isRunIntentEvent(enrichedEvent)) {
    return await executeNewGraphCreation(enrichedEvent, capabilitiesApi);
  } else {
    return await resumeGraphCreation(enrichedEvent, capabilitiesApi);
  }
}

async function createGraph(
  enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent,
  capabilitiesApi: CapabilitiesApi
): Promise<any> {
  const { agentMetadata } = enrichedEvent;
  
}

/**
 * Execute new graph creation workflow
 */
async function executeNewGraphCreation(
  runEvent: EnrichedRunIntentEvent,
  capabilitiesApi: CapabilitiesApi
): Promise<any> {
  const { payload, agentMetadata } = runEvent;

  console.log('Starting new graph creation with payload:', payload);

  // TODO: Implement actual graph creation logic using connect_hub capabilities
  // This would involve:
  // 1. Analyzing the input requirements
  // 2. Determining required capabilities
  // 3. Creating the graph structure
  // 4. Validating the graph
  
  // Mock implementation for now
  const graphCreationResult = {
    graphId: `graph_${Date.now()}`,
    status: 'created',
    nodes: payload.nodeCount || 3,
    capabilities: agentMetadata.capabilities,
    createdAt: new Date().toISOString(),
  };

  console.log('Graph creation result:', graphCreationResult);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));

  return graphCreationResult;
}

/**
 * Resume graph creation workflow after HIL response
 */
async function resumeGraphCreation(
  resumeEvent: EnrichedResumeIntentEvent,
  capabilitiesApi: CapabilitiesApi
): Promise<any> {
  const { hilResponse, agentMetadata } = resumeEvent;

  console.log('Resuming graph creation with HIL response:', hilResponse);

  // TODO: Implement graph creation resume logic
  // This would involve:
  // 1. Loading the previous graph state
  // 2. Applying the HIL response
  // 3. Continuing the creation process

  // Mock implementation for now
  const resumeResult = {
    graphId: `resumed_graph_${Date.now()}`,
    status: 'resumed',
    hilResponse: hilResponse.userResponses,
    updatedAt: new Date().toISOString(),
  };

  console.log('Graph creation resume result:', resumeResult);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));

  return resumeResult;
}

/**
 * Publish run started event to Kinesis
 */
async function publishRunStartedEvent(
  enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent
): Promise<void> {
  const payload = createKinesisPayload(
    'graph_creator_run_started',
    enrichedEvent.runId,
    enrichedEvent.agentId,
    enrichedEvent.orgId,
    'started',
    {
      agentType: 'graph_creator',
      eventType: enrichedEvent.eventType,
    }
  );

  await publishToKinesis(payload);
}

/**
 * Publish run completed event to Kinesis
 */
async function publishRunCompletedEvent(
  enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent,
  result: any
): Promise<void> {
  const payload = createKinesisPayload(
    'graph_creator_run_completed',
    enrichedEvent.runId,
    enrichedEvent.agentId,
    enrichedEvent.orgId,
    'completed',
    {
      agentType: 'graph_creator',
      result,
    }
  );

  await publishToKinesis(payload);
}

/**
 * Publish run failed event to Kinesis
 */
async function publishRunFailedEvent(detail: any, error: any): Promise<void> {
  try {
    const payload = createKinesisPayload(
      'graph_creator_run_failed',
      detail.runId || 'unknown',
      detail.agentId || 'unknown',
      detail.orgId || 'unknown',
      'failed',
      {
        agentType: 'graph_creator',
      },
      error.message || String(error)
    );

    await publishToKinesis(payload);
  } catch (publishError) {
    console.error('Failed to publish failure event:', publishError);
  }
} 