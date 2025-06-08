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

/**
 * MainAgentExecutor Lambda Handler
 * 
 * This lambda handles execution of general agent workflows (non-graph-creator).
 * It receives enriched events from EventBridge and executes agent workflows
 * using connect_hub capabilities.
 */
export const lambdaHandler = async (event: any, context: Context): Promise<void> => {
  console.log('MainAgentExecutor lambda triggered:', JSON.stringify(event, null, 2));

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

    // Validate that we have agent metadata
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

    // Execute agent workflow
    console.log(`Executing agent workflow for run: ${enrichedEvent.runId}`);
    const result = await executeAgentWorkflow(enrichedEvent, capabilitiesApi);

    // Check if HIL (Human-in-the-Loop) is required
    if (result.hilRequired) {
      await publishHilRequestedEvent(enrichedEvent, result.hilPrompt);
    } else {
      // Publish run completed event
      await publishRunCompletedEvent(enrichedEvent, result);
    }

    console.log(`Successfully executed agent workflow for run: ${enrichedEvent.runId}`);

  } catch (error) {
    console.error('Error in MainAgentExecutor:', error);
    
    // Attempt to publish failure event if we have enough context
    if (event?.detail?.runId) {
      await publishRunFailedEvent(event.detail, error);
    }
    
    handleLambdaError(error, 'MainAgentExecutor');
  }
};

/**
 * Execute agent workflow using connect_hub capabilities
 */
async function executeAgentWorkflow(
  enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent,
  capabilitiesApi: CapabilitiesApi
): Promise<any> {
  const { agentMetadata } = enrichedEvent;

  console.log(`Executing agent: ${agentMetadata.name} (${agentMetadata.type})`);

  // Determine workflow type based on event
  if (isRunIntentEvent(enrichedEvent)) {
    return await executeNewAgentRun(enrichedEvent, capabilitiesApi);
  } else {
    return await resumeAgentExecution(enrichedEvent, capabilitiesApi);
  }
}

/**
 * Execute new agent run workflow
 */
async function executeNewAgentRun(
  runEvent: EnrichedRunIntentEvent,
  capabilitiesApi: CapabilitiesApi
): Promise<any> {
  const { payload, agentMetadata } = runEvent;

  console.log('Starting new agent execution with payload:', payload);
  console.log('Agent capabilities:', agentMetadata.capabilities);

  // TODO: Implement actual agent execution logic using connect_hub capabilities
  // This would involve:
  // 1. Analyzing the payload and agent capabilities
  // 2. Orchestrating the required capabilities
  // 3. Executing the agent workflow
  // 4. Handling any required integrations

  // Mock implementation for now
  const executionResult = {
    runId: runEvent.runId,
    agentId: runEvent.agentId,
    status: 'completed',
    output: `Agent ${agentMetadata.name} processed the request successfully`,
    capabilities_used: agentMetadata.capabilities,
    executionTime: 2000,
    completedAt: new Date().toISOString(),
  };

  // Simulate some processing based on agent type
  if (agentMetadata.type === 'digital_employee') {
    await simulateDigitalEmployeeExecution(payload, agentMetadata);
  } else {
    await simulateWorkflowExecution(payload, agentMetadata);
  }

  console.log('Agent execution result:', executionResult);
  
  return executionResult;
}

/**
 * Resume agent execution after HIL response
 */
async function resumeAgentExecution(
  resumeEvent: EnrichedResumeIntentEvent,
  capabilitiesApi: CapabilitiesApi
): Promise<any> {
  const { hilResponse, agentMetadata } = resumeEvent;

  console.log('Resuming agent execution with HIL response:', hilResponse);

  // TODO: Implement agent execution resume logic
  // This would involve:
  // 1. Loading the previous execution state
  // 2. Applying the HIL response
  // 3. Continuing the agent execution

  // Mock implementation for now
  const resumeResult = {
    runId: resumeEvent.runId,
    agentId: resumeEvent.agentId,
    status: 'completed',
    output: `Agent ${agentMetadata.name} resumed and completed with HIL response`,
    hilResponse: hilResponse.userResponses,
    resumedAt: new Date().toISOString(),
  };

  console.log('Agent resume result:', resumeResult);
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));

  return resumeResult;
}

/**
 * Simulate digital employee execution
 */
async function simulateDigitalEmployeeExecution(
  payload: Record<string, any>,
  agentMetadata: any
): Promise<void> {
  console.log('Simulating digital employee execution...');
  
  // Simulate processing based on capabilities
  if (agentMetadata.capabilities.includes('email_processing')) {
    console.log('Processing email...');
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  if (agentMetadata.capabilities.includes('knowledge_retrieval')) {
    console.log('Retrieving knowledge...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Simulate workflow execution
 */
async function simulateWorkflowExecution(
  payload: Record<string, any>,
  agentMetadata: any
): Promise<void> {
  console.log('Simulating workflow execution...');
  
  // Simulate workflow steps
  const steps = payload.steps || 3;
  for (let i = 1; i <= steps; i++) {
    console.log(`Executing workflow step ${i}/${steps}`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Publish run started event to Kinesis
 */
async function publishRunStartedEvent(
  enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent
): Promise<void> {
  const payload = createKinesisPayload(
    'agent_run_started',
    enrichedEvent.runId,
    enrichedEvent.agentId,
    enrichedEvent.orgId,
    'started',
    {
      agentType: enrichedEvent.agentMetadata.type,
      agentName: enrichedEvent.agentMetadata.name,
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
    'agent_run_completed',
    enrichedEvent.runId,
    enrichedEvent.agentId,
    enrichedEvent.orgId,
    'completed',
    {
      agentType: enrichedEvent.agentMetadata.type,
      agentName: enrichedEvent.agentMetadata.name,
      result,
    }
  );

  await publishToKinesis(payload);
}

/**
 * Publish HIL requested event to Kinesis
 */
async function publishHilRequestedEvent(
  enrichedEvent: EnrichedRunIntentEvent | EnrichedResumeIntentEvent,
  hilPrompt: any
): Promise<void> {
  const payload = createKinesisPayload(
    'agent_hil_requested',
    enrichedEvent.runId,
    enrichedEvent.agentId,
    enrichedEvent.orgId,
    'hil_requested',
    {
      agentType: enrichedEvent.agentMetadata.type,
      agentName: enrichedEvent.agentMetadata.name,
      hilPrompt,
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
      'agent_run_failed',
      detail.runId || 'unknown',
      detail.agentId || 'unknown',
      detail.orgId || 'unknown',
      'failed',
      {
        agentType: detail.agentMetadata?.type || 'unknown',
        agentName: detail.agentMetadata?.name || 'unknown',
      },
      error.message || String(error)
    );

    await publishToKinesis(payload);
  } catch (publishError) {
    console.error('Failed to publish failure event:', publishError);
  }
} 