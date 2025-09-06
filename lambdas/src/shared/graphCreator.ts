import { tool, ToolRunnableConfig } from "@langchain/core/tools";
import { StateGraph, START, END, Send, Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { interrupt, Command } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  createReactAgent,
  createReactAgentAnnotation,
} from "@langchain/langgraph/prebuilt";
import {
  Configuration,
  CapabilitiesApi,
  TriggersApi,
} from "@ewestern/connect_hub_sdk";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { CompiledStateGraph } from "@langchain/langgraph";
import { Static, Type } from "@sinclair/typebox";
import { WorkflowSchema } from "@ewestern/events";
import { ToolMessage } from "@langchain/core/messages";

const WORKFLOW_BREAKDOWN_PROMPT = `
You are an expert in breaking down job descriptions into one or more workflows capable of being performed by an AI agent.
You will be given a job description from a user that attempts to describe the work that an AI employee will be doing.
Your job is to break down the job description into one or more workflows. 
A workflow is a simple set of closely related steps that can be performed by an agent.
Also identify how the agent should be activated in order to successfully perform the workflows.
You must return a list of workflows using the workflow schema. All workflows must define more than one step, and each step must have a requirement.
You will match the workflows to capabilities in a future step. For now, our goal is to identify the workflows.
Avoid creating workflows that are so similar that they would be redundant.
`;

//You can ask the user for clarification or feedback if needed.

const WORKFLOW_MATCHER_PROMPT = `
You are an expert in matching workflows to capabilities.
You will be given an abstract set of workflows that an AI agent may be asked to perform.
In addition to the core capabilities of frontier LLMs, this agent will be able to use the tools (or capabilities)
identified by the get_capabilities tool.
You must also identify a trigger that will be used to activate the agent. If you have enough information to supply the trigger parameters, do so.
If you do not, you must leave the triggerParams field empty, as it will be resolved in a later step.
Remember that all user-specific information required for interacting with capabilities is handled by Connect Hub, so you do not need to ask the user for this information.
You MUST call get_capabilities and get_triggers before you produce your final answer.  
Do not respond with a final answer until both calls have been made.
You MUST only return capability ids and trigger ids that you obtained by calling the provided tools.
If a required capability/trigger isn't returned by the tool, list the workflow as unsatisfied instead of inventing a new id.
You may ask the user for clarification or feedback if needed, but do not ask the same question twice, and be respectful of the user's time.
`;

const AGENT_CREATOR_PROMPT = `
You are an expert in creating LLM agents.
You will be given a workflow, as well as an initial set of capabilities and triggers that the agent will use to perform the workflow.
Create a prompt that will be used to guide the agent's behavior.
You may ask the user for clarification or feedback if needed, but do not ask the same question twice, and be respectful of the user's time.
`;

const TRIGGER_PARAM_RESOLVER_PROMPT = `
You are an expert in determining what information is needed to identify events that will trigger agents.
You will be given an agent, along with a trigger that will be used to activate the agent.
Use your tools to gather the information needed to identify the trigger parameters.
`;

interface MessageInput {
  messages: {
    role: "user";
    content: string;
  }[];
}

export const AgentSchema = Type.Recursive((This) =>
  Type.Object({
    id: Type.ReadonlyOptional(Type.String()),
    name: Type.String(),
    description: Type.String(),
    capabilities: Type.Array(
      Type.Object({
        providerId: Type.String(),
        id: Type.String(),
      })
    ),
    trigger: Type.Object({
      providerId: Type.String(),
      id: Type.String(),
      triggerParams: Type.Optional(
        Type.Unknown({
          description:
            "Parameters for the trigger in the format specified by the get_triggers tool.",
        })
      ),
    }),
    prompt: Type.String(),
    //subagents: Type.Array(This),
  })
);

const UnsatisfiedWorkflowSchema = Type.Object({
  description: Type.String({
    description: "A description of the workflow.",
  }),
  explanation: Type.String({
    description: "An explanation of why the workflow could not be satisfied.",
  }),
});

export const AiEmployeeSchema = Type.Object({
  name: Type.String({
    description: "A human-friendly name for the AI employee.",
  }),
  description: Type.String({
    description: "What the AI employee does.",
  }),
  unsatisfiedWorkflows: Type.Array(UnsatisfiedWorkflowSchema),
  agents: Type.Array(AgentSchema),
});

const ConversationEntry = Type.Object({
  question: Type.String(),
  answer: Type.String(),
  nodeContext: Type.String({
    description: "Which node/agent asked this question",
  }),
  timestamp: Type.String(),
});

const GraphState = Annotation.Root({
  ...createReactAgentAnnotation().spec,
  workflows: Annotation<Static<typeof WorkflowSchema>[]>({
    reducer: (acc, curr) => {
      return [...acc, ...curr];
    },
    default: () => [],
  }),
  agents: Annotation<Static<typeof AgentSchema>[]>({
    reducer: (acc, curr) => {
      return [...acc, ...curr];
    },
    default: () => [],
  }),
  unsatisfiedWorkflows: Annotation<Static<typeof UnsatisfiedWorkflowSchema>[]>({
    reducer: (acc, curr) => {
      return [...acc, ...curr];
    },
    default: () => [],
  }),
  humanFeedbackHistory: Annotation<Static<typeof ConversationEntry>[]>({
    reducer: (acc, curr) => {
      return [...acc, ...curr];
    },
    default: () => [],
  }),
});

const ParamResolverState = Annotation.Root({
  ...createReactAgentAnnotation().spec,
  agent: Annotation<Static<typeof AgentSchema>>({
    reducer: (acc, curr) => {
      return curr;
    },
  }),
  humanFeedbackHistory: Annotation<Static<typeof ConversationEntry>[]>({
    reducer: (acc, curr) => {
      return [...acc, ...curr];
    },
    default: () => [],
  }),
});

const SubgraphState = Annotation.Root({
  workflow: Annotation<Static<typeof WorkflowSchema>>({
    reducer: (acc, curr) => {
      return curr;
    },
  }),
  agent: Annotation<Static<typeof AgentSchema> | null>({
    reducer: (acc, curr) => {
      return curr;
    },
  }),
  unsatisfiedWorkflow: Annotation<Static<
    typeof UnsatisfiedWorkflowSchema
  > | null>({
    reducer: (acc, curr) => {
      return curr;
    },
    default: () => null,
  }),
  humanFeedbackHistory: Annotation<Static<typeof ConversationEntry>[]>({
    reducer: (acc, curr) => {
      return [...acc, ...curr];
    },
    default: () => [],
  }),
});

export class GraphCreator {
  public WORKFLOW_MATCHER_AGENT = "workflow_matcher_agent";
  public WORKFLOW_AGENT_CREATOR_AGENT = "workflow_agent_creator_agent";
  public WORKFLOW_SUBGRAPH_AGENT = "workflow_subgraph_agent";
  public WORKFLOW_BREAKDOWN_AGENT = "workflow_breakdown_agent";
  public JOIN_ONE = "join_one";
  public JOIN_TWO = "join_two";
  public WAIT_FOR_OAUTH = "wait_for_oauth";
  public RESOLVE_TRIGGER_PARAMS = "resolve_trigger_params";
  private checkpointer: PostgresSaver;
  private model: string;
  public graph: CompiledStateGraph<any, any, any, any, any, any> | null = null;

  constructor(checkpointerDbUrl: string, model: string) {
    this.model = model;
    this.checkpointer = PostgresSaver.fromConnString(checkpointerDbUrl);
  }
  async getLLm() {
    const llm = new ChatAnthropic({
      model: this.model,
      temperature: 0.0,
    });
    return llm;
  }

  async start(jobDescription: string, config: RunnableConfig) {
    return this.stream(
      {
        messages: [
          {
            role: "user",
            content: jobDescription,
          },
        ],
      },
      config
    );
  }

  async resume(command: Command, config: RunnableConfig) {
    return this.stream(command, config);
  }
  fanOutTriggerResolution(state: typeof GraphState.State) {
    return state.agents.map((agent) => {
      if (
        agent.trigger.triggerParams &&
        Object.keys(agent.trigger.triggerParams).length > 0
      ) {
        return this.JOIN_TWO;
      }
      return new Send(this.RESOLVE_TRIGGER_PARAMS, {
        agent: agent,
        humanFeedbackHistory: state.humanFeedbackHistory,
      });
    });
  }

  fanOut(state: typeof GraphState.State) {
    return state.workflows.map((workflow) => {
      return new Send(this.WORKFLOW_SUBGRAPH_AGENT, {
        workflow: workflow,
        humanFeedbackHistory: state.humanFeedbackHistory,
      });
    });
  }
  joiner(state: typeof GraphState.State) {
    return state;
  }

  async createGraph() {
    const builder = new StateGraph(GraphState)
      .addNode(
        this.WORKFLOW_BREAKDOWN_AGENT,
        this.workflowBreakdownAgent.bind(this)
      )
      .addNode(
        this.WORKFLOW_SUBGRAPH_AGENT,
        this.workflowSubgraphNode.bind(this)
      )
      .addNode(this.JOIN_ONE, this.joiner.bind(this))
      .addNode(this.JOIN_TWO, this.joiner.bind(this))
      .addNode(
        this.RESOLVE_TRIGGER_PARAMS,
        this.resolveTriggerParams.bind(this)
      )
      .addEdge(START, this.WORKFLOW_BREAKDOWN_AGENT)
      .addConditionalEdges(
        this.WORKFLOW_BREAKDOWN_AGENT,
        this.fanOut.bind(this)
      )
      .addEdge(this.WORKFLOW_SUBGRAPH_AGENT, this.JOIN_ONE)
      .addConditionalEdges(
        this.JOIN_ONE,
        this.fanOutTriggerResolution.bind(this)
      )
      .addEdge(this.RESOLVE_TRIGGER_PARAMS, this.JOIN_TWO)
      .addEdge(this.JOIN_TWO, END);

    const agent = builder.compile({ checkpointer: this.checkpointer });

    return agent;
  }
  async resolveTriggerParams(
    state: typeof ParamResolverState.State,
    config: RunnableConfig
  ) {
    const paramResolverTool = await this.getTriggerParamOptionsTool(
      state.agent.trigger,
      config
    );
    const llm = await this.getLLm();
    const agent = createReactAgent({
      name: this.RESOLVE_TRIGGER_PARAMS,
      llm: llm,
      tools: [this.getHumanInputTool(), paramResolverTool],
      prompt: TRIGGER_PARAM_RESOLVER_PROMPT,
      responseFormat: Type.Object({
        agent: AgentSchema,
      }),
    });
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            agent: state.agent,
            humanFeedbackHistory: state.humanFeedbackHistory,
          }),
        },
      ],
    });
    return {
      agent: result.structuredResponse.agent,
    };
  }

  async workflowBreakdownAgent(state: typeof GraphState.State) {
    const llm = await this.getLLm();
    const agent = createReactAgent({
      name: this.WORKFLOW_BREAKDOWN_AGENT,
      llm: llm,
      tools: [],
      checkpointer: this.checkpointer,
      prompt: WORKFLOW_BREAKDOWN_PROMPT,
      responseFormat: Type.Object({
        workflows: Type.Array(WorkflowSchema),
      }),
    });
    const result = await agent.invoke(state);
    return {
      workflows: result.structuredResponse.workflows,
    };
  }

  // SUBGRAPH

  async workflowSubgraphNode(state: {
    workflow: Static<typeof WorkflowSchema>;
    humanFeedbackHistory: Static<typeof ConversationEntry>[];
  }) {
    const builder = new StateGraph(SubgraphState)
      .addNode(
        this.WORKFLOW_MATCHER_AGENT,
        this.workflowMatcherAgent.bind(this)
      )
      .addNode(
        this.WORKFLOW_AGENT_CREATOR_AGENT,
        this.workflowAgentCreator.bind(this)
      )
      .addEdge(START, this.WORKFLOW_MATCHER_AGENT)
      .addConditionalEdges(
        this.WORKFLOW_MATCHER_AGENT,
        this.skipUnsatisfied.bind(this)
      )
      .addEdge(this.WORKFLOW_AGENT_CREATOR_AGENT, END);
    const agent = builder.compile({ checkpointer: this.checkpointer });
    const result = await agent.invoke({
      workflow: state.workflow,
      humanFeedbackHistory: state.humanFeedbackHistory,
    });

    if (result.agent) {
      return {
        agents: [result.agent],
        unsatisfiedWorkflows: [],
        humanFeedbackHistory: result.humanFeedbackHistory,
      };
    } else {
      return {
        agents: [],
        unsatisfiedWorkflows: [result.unsatisfiedWorkflow],
        humanFeedbackHistory: result.humanFeedbackHistory,
      };
    }
  }

  skipUnsatisfied(state: typeof SubgraphState.State) {
    return state.unsatisfiedWorkflow ? END : this.WORKFLOW_AGENT_CREATOR_AGENT;
  }

  async workflowMatcherAgent(state: typeof SubgraphState.State) {
    const llm = await this.getLLm();
    const agent = createReactAgent({
      name: this.WORKFLOW_MATCHER_AGENT,
      llm: llm,
      tools: [
        this.getHumanInputTool(),
        this.getCapabilitiesTool(),
        this.getTriggersTool(),
      ],
      checkpointer: this.checkpointer,
      prompt: WORKFLOW_MATCHER_PROMPT,
      responseFormat: Type.Object({
        agent: Type.Optional(Type.Omit(AgentSchema, ["prompt"])),
        unsatisfiedWorkflow: Type.Optional(UnsatisfiedWorkflowSchema),
      }),
    });
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            workflow: state.workflow,
            humanFeedbackHistory: state.humanFeedbackHistory,
          }),
        },
      ],
    });

    if (result.structuredResponse.agent) {
      return {
        agent: result.structuredResponse.agent,
      };
    } else {
      return {
        unsatisfiedWorkflow: result.structuredResponse.unsatisfiedWorkflow,
      };
    }
  }

  async workflowAgentCreator(state: typeof SubgraphState.State) {
    const llm = await this.getLLm();
    const agent = createReactAgent({
      name: this.WORKFLOW_AGENT_CREATOR_AGENT,
      llm: llm,
      tools: [this.getHumanInputTool()],
      prompt: AGENT_CREATOR_PROMPT,
      responseFormat: Type.Object({
        agent: AgentSchema,
      }),
    });
    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            workflow: state.workflow,
            agent: state.agent,
            humanFeedbackHistory: state.humanFeedbackHistory,
          }),
        },
      ],
    });
    return {
      agent: result.structuredResponse.agent,
    };
  }

  async stream(input: MessageInput | Command, config: RunnableConfig) {
    await this.checkpointer.setup();
    const graph = await this.createGraph();
    return graph.stream(input, {
      ...config,
      recursionLimit: 100,
      streamMode: "updates",
    });
  }

  getHumanInputTool() {
    return tool(
      async (input: any, config: ToolRunnableConfig) => {
        const response = await interrupt({
          input,
          type: "human_input",
        });
        return new Command({
          update: {
            humanFeedbackHistory: [
              {
                question: input,
                answer: response,
                nodeContext: config.toolCall?.id!,
                timestamp: new Date().toISOString(),
              },
            ],
            messages: [
              new ToolMessage({
                content: JSON.stringify(response),
                tool_call_id: config.toolCall?.id!,
              }),
            ],
          },
        });
      },
      {
        name: "human_input",
        description: `Used to ask the user for clarifications of the job description.
          Use only non-technical language.`,
        schema: Type.Object(
          {
            question: Type.String({
              description: "A question that the user should answer.",
            }),
          },
          { additionalProperties: false }
        ),
      }
    );
  }

  getCapabilitiesTool() {
    return tool(
      async (input: any, config: RunnableConfig) => {
        const connectHubConfig = new Configuration({
          basePath: config.configurable?.connectHubApiUrl,
        });
        const capabilitiesApi = new CapabilitiesApi(connectHubConfig);
        try {
          const capabilities = await capabilitiesApi.capabilitiesGet();
          return {
            capabilities: capabilities.flatMap((provider) => {
              return provider.capabilities.map((capability) => {
                return {
                  providerId: provider.id,
                  id: capability.id,
                  description: capability.description,
                };
              });
            }),
          };
        } catch (error) {
          return {
            capabilities: [],
          };
        }
      },
      {
        name: "get_capabilities",
        description: "Get the capabilities for the agent",
        schema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
      }
    );
  }
  // TODO: update this to take a list of selected triggers.
  // We then retrieve the triggers, along with the options request schema.
  async getTriggerParamOptionsTool(
    { providerId, id }: { providerId: string; id: string },
    config: RunnableConfig
  ) {
    const triggersApi = new TriggersApi(
      new Configuration({
        basePath: config.configurable?.connectHubApiUrl,
      })
    );
    const trigger = await triggersApi.triggersProviderIdTriggerIdGet({
      providerId: providerId,
      triggerId: id,
    });
    return tool(
      async (input: any, config: RunnableConfig) => {
        return triggersApi.triggersParamOptionsProviderIdTriggerIdGet({
          providerId: providerId,
          triggerId: id,
        });
      },
      {
        name: "get_trigger_param_options",
        description: `
          Get options for identifying the parameters necessary to activate the trigger ${trigger.displayName}.
        `,
        schema: trigger.optionsRequestSchema,
      }
    );
  }
  getTriggersTool() {
    return tool(
      async (input: any, config: RunnableConfig) => {
        const connectHubConfig = new Configuration({
          basePath: config.configurable?.connectHubApiUrl,
        });
        const triggersApi = new TriggersApi(connectHubConfig);
        const triggers = await triggersApi.triggersGet();
        return {
          triggers: triggers.map((trigger) => ({
            id: trigger.id,
            providerId: trigger.providerId,
            description: trigger.description,
          })),
        };
      },
      {
        name: "get_triggers",
        description: "Get the triggers for the agent",
        schema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
      }
    );
  }
}
