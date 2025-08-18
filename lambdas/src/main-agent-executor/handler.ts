import { Context } from "aws-lambda";
import { Configuration, CapabilitiesApi } from "@ewestern/connect_hub_sdk";
import {
  getEnv,
  publishToKinesis,
  requestCognitoM2MToken,
  getCurrentTimestamp,
} from "../shared/index.js";
import { RunIntentEvent, ResumeIntentEvent } from "@ewestern/events";
import {
  Configuration as AgentsConfiguration,
  AgentsApi,
} from "@ewestern/agents_core_sdk";
import { LLMResult } from "@langchain/core/outputs.js";
import {
  LLMUsageEvent,
  RequestApprovalEvent,
  ApprovalRequest,
} from "@ewestern/events";
import { EventType } from "@ewestern/events";
import { Executor } from "../shared/executor.js";
import {
  Command,
  INTERRUPT,
  Interrupt,
  isInterrupted,
} from "@langchain/langgraph";

interface LambdaEvent {
  detail: {
    event: RunIntentEvent | ResumeIntentEvent;
  };
}

const model = "claude-sonnet-4-0";

async function getToken(): Promise<string> {
  return requestCognitoM2MToken().then((token) => {
    return token.access_token;
  });
}
/**
 * MainAgentExecutor Lambda Handler
 *
 * This lambda handles execution of general agent workflows (non-graph-creator).
 * It receives enriched events from EventBridge and executes agent workflows
 * using connect_hub capabilities.
 */
export const lambdaHandler = async (
  { detail: { event } }: LambdaEvent,
  context: Context
): Promise<void> => {
  console.log(
    "MainAgentExecutor lambda triggered:",
    JSON.stringify(event, null, 2)
  );
  const callbacks = {
    handleLLMEnd: async (
      output: LLMResult,
      runId: string,
      parentRunId: string | undefined,
      tags: string[]
    ) => {
      const tokenUsage = output.llmOutput?.["tokenUsage"];
      if (tokenUsage) {
        const llmUsageEvent: LLMUsageEvent = {
          type: EventType.LLMUsage,
          orgId: event.orgId,
          timestamp: getCurrentTimestamp(),
          agentId: event.agentId,
          executionId: event.executionId,
          model: model,
          promptTokens: tokenUsage.promptTokens,
          completionTokens: tokenUsage.completionTokens,
          totalTokens: tokenUsage.totalTokens,
          prompt: output.generations[0][0].text,
        };
        publishToKinesis(llmUsageEvent, event.executionId);
      }
    },
  };
  const env = getEnv();
  const connectHubConfiguration = new Configuration({
    basePath: env.connectHubApiUrl,
    accessToken: getToken,
  });
  const agentsConfiguration = new AgentsConfiguration({
    basePath: env.agentsCoreApiUrl,
    accessToken: getToken,
  });
  const agentsApi = new AgentsApi(agentsConfiguration);
  try {
    const agent = await agentsApi.v1AgentsIdGet({
      id: event.agentId,
    });
    if (!agent) {
      throw new Error("Agent not found");
    }
    const config = {
      configurable: {
        ...env,
        orgId: event.orgId,
        thread_id: event.executionId,
        agent_id: event.agentId,
      },
      callbacks: [callbacks],
    };
    const executor = new Executor(
      agent,
      connectHubConfiguration,
      env.checkpointerDbUrl!,
      model
    );
    let stream: AsyncGenerator<any, any, any>;
    if (event.type === EventType.RunIntent) {
      const detail = event.details;
      stream = await executor.start(detail, config);
    } else if (event.type === EventType.ResumeIntent) {
      stream = await executor.resume(
        new Command({ resume: event.resume }),
        config
      );
    } else {
      throw new Error(`Unsupported event type: ${event}`);
    }

    for await (const chunk of stream) {
      if (isInterrupted(chunk)) {
        const interrupt = chunk[INTERRUPT][0] as Interrupt<{
          capability: {
            providerId: string;
            id: string;
          };
          formattedRequest: ApprovalRequest;
        }>;
        const feedbackEvent: RequestApprovalEvent = {
          type: EventType.RequestApproval,
          orgId: event.orgId,
          userId: event.userId,
          timestamp: getCurrentTimestamp(),
          capability: {
            providerId: interrupt.value!.capability.providerId,
            id: interrupt.value!.capability.id,
          },
          agentId: event.agentId,
          executionId: event.executionId,
          request: interrupt.value!.formattedRequest,
        };
        await publishToKinesis(feedbackEvent, event.executionId);
        break;
      }
    }
  } catch (error) {
    await publishToKinesis(
      {
        type: EventType.RunCompleted,
        orgId: event.orgId,
        userId: event.userId,
        timestamp: getCurrentTimestamp(),
        executionId: event.executionId,
        agentId: event.agentId,
        status: "error" as const,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      event.executionId
    );
  }
  await publishToKinesis(
    {
      type: EventType.RunCompleted,
      orgId: event.orgId,
      userId: event.userId,
      timestamp: getCurrentTimestamp(),
      executionId: event.executionId,
      agentId: event.agentId,
      status: "success" as const,
      message: "",
    },
    event.executionId
  );
};
