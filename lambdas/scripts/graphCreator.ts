import { LLMResult } from "@langchain/core/outputs";
import { GraphCreator } from "../src/shared/graphCreator";
import dotenv from "dotenv";
import { Type } from "@sinclair/typebox";
import { isInterrupted, INTERRUPT, Command } from "@langchain/langgraph";
import * as readline from "readline";

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
We’re hiring a part-time AI Executive Assistant to remove two routine tasks from our COO’s plate.

1. Daily email digest 
   * pull all *unread* email received in the COO’s Gmail inbox since the last digest.  
   * Generate a brief three-bullet summary.  
   * Post that summary in the Slack channel #exec-updates.

2. Daily social-media post
   * Immediately after posting to Slack, publish the same summary as a tweet from our @ExampleCo Twitter account.
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
};

async function processStream(
  graphCreator: GraphCreator,
  stream: AsyncIterable<any>,
  config: any
): Promise<void> {
  for await (const chunk of stream) {
    console.log("CHUNK");
    console.log(JSON.stringify(chunk, null, 2));

    // Check if this chunk contains an interrupt
    if (isInterrupted(chunk)) {
      const interrupt = chunk[INTERRUPT][0];
      const question = (interrupt.value as any)?.question;
      
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
  const graphCreator = new GraphCreator(process.env.CHECKPOINTER_DB_URL!, "claude-sonnet-4-0");

  const config = {
    callbacks: [callbacks],
    configurable: {
      connectHubApiUrl: process.env.CONNECT_HUB_API_URL,
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
