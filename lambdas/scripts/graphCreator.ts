import { LLMResult } from "@langchain/core/outputs";
import { GraphCreator } from "../src/shared/graphCreator";
import dotenv from "dotenv";

import { Type } from "@sinclair/typebox";
import {
  isInterrupted,
  INTERRUPT,
  Command,
  Interrupt,
} from "@langchain/langgraph";
import * as readline from "readline";
import { Serialized } from "@langchain/core/load/serializable";

dotenv.config();

// Create readline interface for command line input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
function getUserInput(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`\n${question}\nYour response: `, (answer) => {
      resolve(answer.trim());
    });
  });
}
const JOB_DESCRIPTION = `
I need an agent to watch for new calendar events on my google calendar, and then add any information 
from the knowledge base or web that is relevant to the event to the event description.
`;

const callbacks = {
  handleLLMEnd: async (
    output: LLMResult,
    runId: string,
    parentRunId: string | undefined,
    tags: string[]
  ) => {
    console.log("LLM END");
    //console.log(JSON.stringify(output, null, 2));
  },
    handleToolEnd(output: any, runId: string, parentRunId?: string, tags?: string[]) {
      console.log("TOOL END");
      console.log(JSON.stringify({output, runId, parentRunId, tags}, null, 2));
    },
    handleToolStart(tool: Serialized, input: string, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runName?: string) {
      console.log("TOOL START");
      console.log(JSON.stringify({tool, input, runId, parentRunId, tags, metadata, runName}, null, 2));
    },
};

async function processStream(
  graphCreator: GraphCreator,
  stream: AsyncIterable<any>,
  config: any
): Promise<void> {
  for await (const chunk of stream) {
    console.log("CHUNK");
    console.log(JSON.stringify(chunk, null, 2));
    console.log("IS INTERRUPTED", isInterrupted(chunk));
    if (isInterrupted(chunk)) {
      const interrupt = chunk[INTERRUPT][0] as Interrupt<{
        type: "human_input";
        input?: {
          question: string;
        };
      }>;
      console.log("INTERRUPT", interrupt);
      const question = interrupt.value?.input?.question;

      if (question) {
        console.log("\n🚨 INTERRUPT: The GraphCreator needs your input!");
        console.log("=".repeat(50));

        // Get user input
        const userResponse = await getUserInput(question);

        console.log(`\n✅ Got your response: "${userResponse}"`);
        console.log("Resuming GraphCreator...\n");

        // Resume the graph with the user's response
        const resumeCommand = new Command({ resume: userResponse });

        // Start a new stream with the resume command
        const newStream = await graphCreator.resume(resumeCommand, config);

        // Recursively process the new stream
        await processStream(graphCreator, newStream, config);
        return; // Exit this stream processing since we've moved to a new one
      }
    }
  }

  console.log("\n🎉 GraphCreator stream completed successfully!");
}

async function main() {
  const graphCreator = new GraphCreator(
    process.env.CHECKPOINTER_DB_URL!,
    "claude-sonnet-4-0"
  );

  const config = {
    callbacks: [callbacks],
    configurable: {
      connectHubApiUrl: process.env.CONNECT_HUB_BASE_URL,
      orgId: "123",
      thread_id: crypto.randomUUID(),
    },
  };

  try {
    console.log("🚀 Starting GraphCreator...");
    const stream = await graphCreator.start(JOB_DESCRIPTION, config);

    await processStream(graphCreator, stream, config);
  } catch (error) {
    console.error("❌ Error occurred:", error);
  } finally {
    // Close the readline interface
    rl.close();
    console.log("\n👋 Script terminated.");
  }
}

main();
