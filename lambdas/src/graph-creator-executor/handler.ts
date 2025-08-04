import { Context } from "aws-lambda";
import {
  Command,
  INTERRUPT,
  isInterrupted,
  type Interrupt,
} from "@langchain/langgraph";
import { getEnv, publishToKinesis } from "../shared/index.js";
import { GraphCreator } from "../shared/graphCreator.js";
import {
  EventType,
  GraphCreatorRunIntentEvent,
  GraphCreatorResumeIntentEvent,
  RequestHumanFeedbackEvent,
  LLMUsageEvent,
  EmployeeStateUpdateEvent,
} from "@ewestern/events";
import { LLMResult } from "@langchain/core/outputs.js";

interface LambdaEvent {
  detail: {
    event: GraphCreatorRunIntentEvent | GraphCreatorResumeIntentEvent;
  };
}
const model = "claude-sonnet-4-0"


export const lambdaHandler = async (
  { detail: { event } }: LambdaEvent,
  context: Context
): Promise<void> => {
  console.log(
    "GraphCreatorExecutor lambda triggered:",
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
          timestamp: new Date().toISOString(),
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
  const config = {
    configurable: {
      ...env,
      orgId: event.orgId,
      thread_id: event.executionId,
    },
    callbacks: [callbacks],
  };
  const graphCreator = new GraphCreator(env.checkpointerDbUrl!, model);
  let stream: AsyncGenerator<any, any, any>;
  if (event.type === EventType.RunIntent) {
    stream = await graphCreator.start(event.jobDescription, config);

  } else if (event.type === EventType.ResumeIntent) {
    stream = await graphCreator.resume(
      new Command({ resume: event.resume }),
      config
    );
  } else {
    throw new Error(`Unsupported event type: ${event}`);
  }
  for await (const chunk of stream) {
    if (chunk[graphCreator.WORKFLOW_BREAKDOWN_AGENT]) {
      const {workflows} = chunk[graphCreator.WORKFLOW_BREAKDOWN_AGENT];
      const updateEvent: EmployeeStateUpdateEvent = {
        type: EventType.EmployeeStateUpdate,
        orgId: event.orgId,
        timestamp: new Date().toISOString(),
        phase: "workflows",
        workflows: workflows,
        agents: [],
        unsatisfiedWorkflows: [],
      }
      await publishToKinesis(updateEvent, event.executionId);
    } else if (chunk[graphCreator.JOIN]) {
      const {agents, unsatisfiedWorkflows} = chunk[graphCreator.JOIN];
      const updateEvent: EmployeeStateUpdateEvent = {
        type: EventType.EmployeeStateUpdate,
        orgId: event.orgId,
        timestamp: new Date().toISOString(),
        phase: "connect",
        agents: agents,
        workflows: [],
        unsatisfiedWorkflows: unsatisfiedWorkflows,
      }
      await publishToKinesis(updateEvent, event.executionId);
    }
    if (isInterrupted(chunk)) {
      const interrupt = chunk[INTERRUPT][0] as Interrupt<{
        question: string;
      }>;
      const question = interrupt.value?.question;
      const feedbackEvent: RequestHumanFeedbackEvent = {
        type: EventType.RequestHumanFeedback,
        userId: event.userId,
        orgId: event.orgId,
        timestamp: new Date().toISOString(),
        executionId: event.executionId,
        request: {
          type: "text",
          text: question || "",
        },
      };
      await publishToKinesis(feedbackEvent, event.executionId);
      break;
    }
  }
};
