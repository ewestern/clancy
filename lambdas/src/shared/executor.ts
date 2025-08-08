import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Command, CompiledStateGraph, interrupt } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { Type } from "@sinclair/typebox";
import { FormattedApprovalRequest } from "@ewestern/events";
import {
  Agent,
  V1AgentsIdPutRequestCapabilitiesInner,
} from "@ewestern/agents_core_sdk";
import {
  CapabilityRisk,
  ProxyApi,
  CapabilitiesApi,
  Configuration,
} from "@ewestern/connect_hub_sdk";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

interface MessageInput {
  messages: {
    role: "user";
    content: string;
  }[];
}

export class Executor {
  private checkpointer: PostgresSaver;
  private model: string;
  public graph: CompiledStateGraph<any, any, any, any, any, any> | null = null;
  public agent: Agent;
  private capabilitiesApi: CapabilitiesApi;
  private proxyApi: ProxyApi;

  constructor(
    agent: Agent,
    connectHubConfiguration: Configuration,
    checkpointerDbUrl: string,
    model: string
  ) {
    this.model = model;
    this.checkpointer = PostgresSaver.fromConnString(checkpointerDbUrl);

    this.capabilitiesApi = new CapabilitiesApi(connectHubConfiguration);
    this.proxyApi = new ProxyApi(connectHubConfiguration);
    this.checkpointer.setup();
    this.agent = agent;
  }

  async getLLm() {
    const llm = new ChatAnthropic({
      model: this.model,
      temperature: 0.0,
    });
    return llm;
  }

  async getCapabilityTools(
    capabilities: V1AgentsIdPutRequestCapabilitiesInner[]
  ) {
    const tools = await Promise.all(
      capabilities.map(async (capabilityId) => {
        const { capability, displayName, description } =
          await this.capabilitiesApi.capabilitiesProviderIdCapabilityIdGet({
            orgId: this.agent.orgId,
            providerId: capabilityId.providerId,
            capabilityId: capabilityId.id,
          });
        return tool(
          async (request: any, config: RunnableConfig) => {
            let canRun = true;

            if (capability.risk in [CapabilityRisk.High]) {
              const formattedRequest = await this.formatApprovalRequest({
                request,
                capabilityName: capability.displayName,
                capabilityDescription: capability.description,
                providerName: displayName,
                providerDescription: description,
                schema: capability.paramsSchema,
              });
              const response = await interrupt(formattedRequest);
              canRun = response.approved;
            }
            if (canRun) {
              const result =
                await this.proxyApi.proxyProviderIdCapabilityIdPost({
                  providerId: capabilityId.providerId,
                  capabilityId: capabilityId.id,
                  proxyProviderIdCapabilityIdPostRequest: {
                    params: request,
                    userId: this.agent.userId,
                    orgId: this.agent.orgId,
                  },
                });
              return result;
            }
            return {
              error: "Approval has been denied",
            };
          },
          {
            name: capability.displayName
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(""),
            description: capability.description,
            schema: capability.paramsSchema,
          }
        );
      })
    );
    return tools;
  }

  async getCapabilityDescriptionTool(
    capability: V1AgentsIdPutRequestCapabilitiesInner
  ) {
    return tool(
      async (request: any, config: RunnableConfig) => {
        const { capability: cap } =
          await this.capabilitiesApi.capabilitiesProviderIdCapabilityIdGet({
            orgId: this.agent.orgId,
            providerId: capability.providerId,
            capabilityId: capability.id,
          });
        return cap.description;
      },
      {
        name: "get_capability_description",
        description: "Get the description of a capability",
      }
    );
  }

  async formatApprovalRequest(request: FormattedApprovalRequest) {
    const model = await this.getLLm();
    const agent = createReactAgent({
      llm: model,
      tools: [],
      checkpointer: this.checkpointer,
      prompt: `
      You are an agent that helps translate an API request into a human readable format appropriate for approval.
      `,
      responseFormat: Type.Object({
        title: Type.String({
          minLength: 5,
          maxLength: 50,
          description: "A short title for the request.",
        }),
        summary: Type.String({
          minLength: 30,
          maxLength: 500,
          description:
            "A summary giving the user an explanation of what action will be taken if they approve.",
        }),
        details: Type.Array(Type.String(), {
          description:
            "A list of details about the request that are relevant to approval.",
        }),
      }),
    });
    const response = await agent.invoke({
      messages: [
        {
          role: "user",
          content: JSON.stringify(request, null, 2),
        },
      ],
    });
    return response.structuredResponse;
  }

  async assembleGraph(agent: Agent) {
    const tools = await this.getCapabilityTools(agent.capabilities);
    return createReactAgent({
      checkpointer: this.checkpointer,
      llm: await this.getLLm(),
      tools: tools,
      prompt: agent.prompt,
    });
  }

  async start(event: any, config: RunnableConfig) {
    return this.stream(
      {
        messages: [
          {
            role: "user",
            content: JSON.stringify(event, null, 2),
          },
        ],
      },
      config
    );
  }

  async resume(command: Command, config: RunnableConfig) {
    return this.stream(command, config);
  }
  async stream(input: MessageInput | Command, config: RunnableConfig) {
    const agent = await this.assembleGraph(this.agent);
    return agent.stream(input, {
      ...config,
      streamMode: "updates",
    });
  }
}
