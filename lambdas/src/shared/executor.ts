import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Command, CompiledStateGraph } from "@langchain/langgraph";
import { initChatModel } from "langchain/chat_models/universal";
import { RunnableConfig } from "@langchain/core/runnables";
import { GraphCreator } from "./graphCreator";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { Type } from "@sinclair/typebox";
import {
  Configuration as ConnectHubConfiguration,
  CapabilitiesApi,
  TriggersApi,
} from "@clancy/connect_hub_sdk";
//import {Configuration, api } from "@clancy/agents_core_sdk"

interface MessageInput {
  messages: {
    role: "user";
    content: string;
  }[];
}

export function createExecutor(
  checkpointerDbUrl: string,
  model: string = "openai:gpt-4o"
) {}

export class Executor {
  private checkpointer: PostgresSaver;
  private model: string;
  public graph: CompiledStateGraph<any, any, any, any, any, any> | null = null;
  constructor(checkpointerDbUrl: string, model: string = "openai:gpt-4o") {
    this.model = model;
    this.checkpointer = PostgresSaver.fromConnString(checkpointerDbUrl);

    this.checkpointer.setup();
  }

  async getLLm() {
    return initChatModel(this.model);
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
  async stream(input: MessageInput | Command, config: RunnableConfig) {
    const llm = await this.getLLm();
    const supervisor = createSupervisor({
      agents: [
        //await this.workflowBreakdownAgent(),
        //await this.workflowMatcherAgent(),
        //await this.agentCreator(),
      ],
      llm,
      prompt: "",
      responseFormat: Type.Object({
        agents: Type.Array(
          Type.Object({
            name: Type.String({ description: "The name of the agent." }),
            description: Type.String({
              description: "A description of the agent.",
            }),
          })
        ),
      }),
    });

    this.graph = supervisor.compile();
    return this.graph.stream(input, {
      ...config,
      streamMode: "updates",
    });
  }
}
