import {
  Annotation,
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import {
  CapabilitiesApi,
  Configuration,
  ProviderCapabilities,
  Capability,
  CapabilityRisk,
  CapabilityRiskFromJSON,
  ProxyApi,
} from "@clancy-ai/sdks";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import {
  ConfigurableChatModelCallOptions,
  ConfigurableModel,
  initChatModel,
} from "langchain/chat_models/universal";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { RunnableConfig } from "@langchain/core/runnables";
import { BaseMessage } from "@langchain/core/messages";
import { isAIMessage } from "@langchain/core/messages";

import dotenv from "dotenv";
import { BaseLanguageModelInput } from "@langchain/core/language_models/base";
import { z } from "zod";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

interface EventWrapper {
  type: string;
  data: object;
  event_time: number;
}

interface RequestApprovalPayload {
  agentId: string;
  runId: string;
  request: any;
  capability: string;
}

async function publishEvent(event: RequestApprovalPayload) {
  const eventBridgeClient = new EventBridgeClient({
    region: "us-east-1",
    profile: "clancy",
  });
  const command = new PutEventsCommand({
    Entries: [
      {
        EventBusName: `clancy-main-staging`,
        DetailType: "RequestApproval",
        Source: "clancy.agents_core.emailAgent",
        Detail: JSON.stringify({
          event_time: Date.now(),
          data: event,
          type: "request_approval",
        }),
      },
    ],
  });
  const response = await eventBridgeClient.send(command);
  console.log("Published event", JSON.stringify(response));
}

dotenv.config();

const capabilitiesApi = new CapabilitiesApi(
  new Configuration({
    basePath: "http://localhost:3001",
  }),
);

const capabilities = await capabilitiesApi.capabilitiesGet({
  orgId: "123",
});
const proxyApi = new ProxyApi(
  new Configuration({
    basePath: "http://localhost:3001",
  }),
);

const humanFeedbackTool = tool(
  async (input: string, config: RunnableConfig) => {
    config.configurable?.thread_id;
    console.log("Invoking human feedback tool", input);
    return "Human feedback tool response";
  },
  {
    name: "human_feedback",
    description: "Use this tool to provide human feedback to the agent.",
    schema: z.object({
      feedback: z.string(),
    }),
  },
);

function toolFromCapability(
  providerCapability: ProviderCapabilities,
  capabilitySchema: Capability,
) {
  return tool(
    async (input: any, config: RunnableConfig) => {
      console.log("Invoking tool", capabilitySchema.id, JSON.stringify(input));
      let canInvoke: boolean = true;
      let updatedInput: any = input;
      console.log("Risk", capabilitySchema.risk);
      if (capabilitySchema.risk === CapabilityRisk.High) {
        const response = await interrupt({
          request: input,
          capability: capabilitySchema.id,
        });
        canInvoke = response.canInvoke;
        updatedInput = response.updatedInput;
      }

      if (canInvoke) {
        const response = await proxyApi.proxyProviderIdCapabilityIdPost({
          orgId: "123",
          providerId: providerCapability.id,
          capabilityId: capabilitySchema.id,
          body: updatedInput,
        });
        console.log("Response", JSON.stringify(response));
        return response;
      } else {
        console.log("ELSE");
        return "Agent has been prohibited from invoking this tool. Terminate the workflow.";
      }
    },
    {
      name: capabilitySchema.id.replaceAll(".", "_"),
      description: capabilitySchema.description,
      schema: capabilitySchema.paramsSchema,
    },
  );
}
type Node = {
  name: string;
  description: string;
  paramsSchema: object;
  resultSchema: object;
};

function createModelNode(
  llm: ConfigurableModel<
    BaseLanguageModelInput,
    ConfigurableChatModelCallOptions
  >,
) {
  return async function modelNode(
    state: typeof MessagesAnnotation.State,
    config?: LangGraphRunnableConfig,
  ): Promise<typeof MessagesAnnotation.State> {
    const response = await llm.invoke(state.messages);
    return { messages: [response] };
  };
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if (isAIMessage(lastMessage)) {
    if (lastMessage.tool_calls && lastMessage.tool_calls.length) {
      return "tools";
    }
    return END;
  }
  return END;
}

async function createNode(
  node: object,
  orgId: string,
  checkpointer: PostgresSaver,
) {
  const capabilities = await capabilitiesApi.capabilitiesGet({
    orgId: orgId,
  });

  const llm = await initChatModel("openai:gpt-4o-mini");

  const tools = capabilities.flatMap((provider) => {
    return provider.capabilities.map((capability) => {
      return toolFromCapability(provider, capability);
    });
  });
  //llm.bindTools(tools);

  //const builder = new StateGraph(MessagesAnnotation)
  //const toolNode = new ToolNode(tools)
  //const modelNode = createModelNode(llm);

  //builder
  //  .addNode("model", modelNode)
  //  .addNode("tools", toolNode)
  //  .addEdge(START, "model")
  //  .addEdge("model", "tools")
  //  .addConditionalEdges("model", shouldContinue, ["tools", END])

  //const agent = builder.compile({ checkpointer });
  //builder.addEdge("model", "tools");
  //builder.addEdge("tools", "model");
  //builder.addEdge("model", END);
  const agent = createReactAgent({
    llm: llm,
    tools: tools,
    checkpointer: checkpointer,
    prompt: `
    You are a helpful assistant that responds to emails. 
    Use the tools provided to you to prioritize helpful, informative and relevant responses.
    If you don't have enough information to send a helpful and relevant response, do not send a response.
    `,
  });
  console.log(agent.nodes);
  //agent.addNode("slack", slackNode);
  return agent;
}

const sampleEmail = {
  from: "customer@example.com",
  to: "support@company.com",
  subject: "Questions about pricing and support",
  body: `Hi,

I'm interested in your platform and have a few questions:

1. What are your pricing plans?
2. Do you offer technical support?
3. Can I integrate with my existing tools?
4. Is there a free trial available?

Looking forward to your response.

Best regards,
John Doe`,
  timestamp: new Date(),
  messageId: "sample-email-123",
};

async function main() {
  const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL || "postgresql://localhost:5432/agents_core",
  );
  await checkpointer.setup();
  const agent = await createNode({}, "123", checkpointer);

  const configuredThreadId = `email-${sampleEmail.messageId}-${Date.now()}`;
  const stream = await agent.stream(
    {
      messages: [
        {
          role: "user",
          content: JSON.stringify(sampleEmail),
        },
      ],
    },
    {
      configurable: { thread_id: configuredThreadId },
      streamMode: "values",
    },
  );

  for await (const event of stream) {
    console.log("Event", JSON.stringify(event));
    const interrupts = event["__interrupt__"];
    console.log("Interrupts", JSON.stringify(interrupts));
    if (interrupts) {
      for (const interrupt of interrupts) {
        console.log("Interrupt", JSON.stringify(interrupt.value));
        const response = await publishEvent({
          agentId: "123",
          runId: configuredThreadId,
          request: interrupt.value.request,
          capability: interrupt.value.capability,
        });
      }
    }
  }
}

main();
