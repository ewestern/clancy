import { Executor } from "../src/shared/executor.js";
import * as readline from "readline";
import { isInterrupted, INTERRUPT, Command } from "@langchain/langgraph";
import { Agent } from "@ewestern/agents_core_sdk";
import { Configuration } from "@ewestern/connect_hub_sdk";
import { LLMResult } from "@langchain/core/outputs";
import dotenv from "dotenv";

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
async function processStream(
  executor: Executor,
  stream: AsyncIterable<any>,
  config: any
): Promise<void> {
  for await (const chunk of stream) {
    console.log("CHUNK");
    console.log(JSON.stringify(chunk, null, 2));

    // Check if this chunk contains an interrupt
    if (isInterrupted(chunk)) {
      const interrupt = chunk[INTERRUPT][0];
      const approvalRequest = interrupt.value as any;

      if (approvalRequest) {
        console.log("\n🚨 INTERRUPT: The Agent needs your input!");
        console.log("=".repeat(50));

        // Get user input
        const userResponse = await getUserInput(question);

        console.log(`\n✅ Got your response: "${userResponse}"`);
        console.log("Resuming GraphCreator...\n");

        // Resume the graph with the user's response
        const resumeCommand = new Command({ resume: userResponse });

        // Start a new stream with the resume command
        const newStream = await executor.resume(resumeCommand, config);

        // Recursively process the new stream
        await processStream(executor, newStream, config);
        return; // Exit this stream processing since we've moved to a new one
      }
    }
  }

  console.log("\n🎉 GraphCreator stream completed successfully!");
}

const callbacks = {
  handleLLMEnd: async (
    output: LLMResult,
    runId: string,
    parentRunId: string | undefined,
    tags: string[]
  ) => {
    console.log("LLM END");
    console.log(JSON.stringify(output, null, 2));
  },
};
async function main() {
  const connectHubConfiguration = new Configuration({
    basePath: process.env.CONNECT_HUB_BASE_URL!,
  });
  const executor = new Executor(
    agent,
    connectHubConfiguration,
    process.env.CHECKPOINTER_DB_URL!,
    "claude-sonnet-4-0"
  );

  const config = {
    callbacks: [callbacks],
    configurable: {
      connectHubApiUrl: process.env.CONNECT_HUB_API_URL,
      orgId: "123",
      thread_id: crypto.randomUUID(),
    },
  };

  try {
    console.log("🚀 Starting Executor...");
    const stream = await executor.start(
      `Agent initiated by a cron at ${new Date().toISOString()}`,
      config
    );

    await processStream(executor, stream, config);
  } catch (error) {
    console.error("❌ Error occurred:", error);
  } finally {
    // Close the readline interface
    rl.close();
    console.log("\n👋 Script terminated.");
  }
}

const agent: Agent = {
  orgId: "123",
  userId: "123",
  employeeId: "123",
  status: "active",
  id: "123",
  name: "Test Agent",
  description: "Test Agent Description",
  capabilities: [
    {
      id: "gmail.messages.search",
      providerId: "google",
    },
    {
      id: "gmail.messages.get",
      providerId: "google",
    },
    {
      id: "memory.retrieve",
      providerId: "internal",
    },
    {
      id: "memory.store",
      providerId: "internal",
    },
    {
      id: "memory.update",
      providerId: "internal",
    },
    {
      id: "chat.post",
      providerId: "slack",
    },
  ],
  trigger: {
    id: "cron",
    providerId: "internal",
    triggerParams: {
      schedule: "0 9-17 * * MON-FRI",
    },
  },
  prompt: `
    You are an Order Processing Agent responsible for automatically handling new orders from the Gmail inbox. You run every 3 hours during business hours (9 AM - 5 PM, Monday-Friday, Eastern Time) to ensure timely order processing.+
                                                                                                                                                                                                                                    +
 ## Your Core Responsibilities                                                                                                                                                                                                      +
                                                                                                                                                                                                                                    +
 1. **Search for New Orders**: Check the Gmail inbox for new emails since your last processing time                                                                                                                                 +
 2. **Send Customer Confirmations**: Reply to customers acknowledging receipt of their orders                                                                                                                                       +
 3. **Notify Packing Team**: Send notifications to the #new-orders Slack channel                                                                                                                                                    +
                                                                                                                                                                                                                                    +
 ## Detailed Instructions                                                                                                                                                                                                           +
                                                                                                                                                                                                                                    +
 ### 1. Order Identification                                                                                                                                                                                                        +
 - Search Gmail for all new emails since your last processing run                                                                                                                                                                   +
 - Use your best judgment to identify which emails represent actual orders vs other correspondence                                                                                                                                  +
 - Keep track of orders you've already processed to avoid duplicates                                                                                                                                                                +
                                                                                                                                                                                                                                    +
 ### 2. Customer Confirmation Process                                                                                                                                                                                               +
 - For each identified order, send a professional acknowledgment email to the customer                                                                                                                                              +
 - Keep the message simple - just acknowledge receipt of their order                                                                                                                                                                +
 - Maintain a professional and friendly tone                                                                                                                                                                                        +
 - The team will handle all follow-up communications and order details                                                                                                                                                              +
                                                                                                                                                                                                                                    +
 ### 3. Slack Notifications                                                                                                                                                                                                         +
 - Post a notification in the #new-orders Slack channel for each new order processed                                                                                                                                                +
 - Include relevant order information that would help the packing team                                                                                                                                                              +
 - No special formatting or tagging required - keep it straightforward                                                                                                                                                              +
                                                                                                                                                                                                                                    +
 ### 4. Error Handling                                                                                                                                                                                                              +
 - If you encounter any errors (email sending failures, Slack connectivity issues, etc.), send a summary message to the #new-orders Slack channel describing the error you encountered                                              +
 - Continue processing other orders even if individual items fail                                                                                                                                                                   +
                                                                                                                                                                                                                                    +
 ### 5. Record Keeping                                                                                                                                                                                                              +
 - Maintain awareness of which orders you've already processed to prevent duplicate handling                                                                                                                                        +
 - Track your processing times to ensure you only handle new emails since your last run                                                                                                                                             +
                                                                                                                                                                                                                                    +
 ## Execution Flow                                                                                                                                                                                                                  +
 1. Search Gmail for new emails since last processing time                                                                                                                                                                          +
 2. Identify potential orders using best judgment                                                                                                                                                                                   +
 3. For each order:                                                                                                                                                                                                                 +
    - Send acknowledgment email to customer                                                                                                                                                                                         +
    - Post notification to #new-orders Slack channel                                                                                                                                                                                +
 4. Handle any errors by reporting them to Slack                                                                                                                                                                                    +
 5. Update your processing timestamp for the next run                                                                                                                                                                               +
                                                                                                                                                                                                                                    +
 Remember: Your role is to provide the initial processing and acknowledgment. The human team will handle all detailed order fulfillment, customer service, and follow-up communications.
    `,
};

main();
