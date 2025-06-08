import { tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import {  interrupt } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ConfigurableChatModelCallOptions, ConfigurableModel, initChatModel } from "langchain/chat_models/universal";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { Type } from "@sinclair/typebox";

export class GraphCreator {

  private checkpointer: PostgresSaver;

  constructor() {
    this.checkpointer = PostgresSaver.fromConnString(
      process.env.DATABASE_URL || "postgresql://localhost:5432/agents_core"
    );

  }

  async createAgent(executionId: string) {
    await this.checkpointer.setup();

    const llm = await initChatModel("openai:gpt-4o-mini");
    const agent = createReactAgent({
      llm: llm,
      tools: this.getTools(),
      checkpointer: this.checkpointer,
      prompt: `
      You are a helpful assistant that responds to emails. 
      Use the tools provided to you to prioritize helpful, informative and relevant responses.
      If you don't have enough information to send a helpful and relevant response, do not send a response.
      `,
    });
  }

  getTools() {
    return [
      this.getHumanInputTool(),
      this.getCapabilitiesTool(),
      this.getTriggersTool(),
    ];
  }

  getHumanInputTool() {
    return tool(async (
      input: any,
      config: RunnableConfig
    ) => {
      const response = await interrupt({
        request: input,
      });
      console.log("Invoking tool", JSON.stringify(response));
      return response.updatedInput;
    }, {
      name: "human_input",
      description: "Get the human input for the agent",
      schema: Type.Object({
        humanInput: Type.String(),
      }),
    });
  }

  getCapabilitiesTool() {
    return tool(async (
        input: any,
        config: RunnableConfig
    ) => {
      console.log("Invoking tool", JSON.stringify(input));
      return {
        capabilities: [],
      };
    }, {
      name: "get_capabilities",
      description: "Get the capabilities for the agent",
      schema: Type.Object({
        capabilities: Type.Array(Type.String()),
      }),
    });
  }
  getTriggersTool() {
    return tool(async (
      input: any,
      config: RunnableConfig
    ) => {
      console.log("Invoking tool", JSON.stringify(input));
      return {
        triggers: [],
      };
    }, {
      name: "get_triggers",
      description: "Get the triggers for the agent",
      schema: Type.Object({
        triggers: Type.Array(Type.String()),
      }),
    });
  }
  

  //async createGraph(jobDescription: string) {
  //  // TODO: Implement graph creation
  //  throw new Error("Not implemented");
  //}
}