// ============================================================================
// TRANSITIONAL MONOLITHIC FILE STRUCTURE
// ----------------------------------------------------------------------------
// This file temporarily contains both reusable framework code and the
// customer_support_email "app".  Each block is annotated with the
// directory/filename where it will reside after extraction.
//
// ENVIRONMENT VARIABLES REQUIRED:
// - DATABASE_URL: PostgreSQL connection string (e.g., "postgresql://user:password@localhost:5432/dbname")
// - OPENAI_API_KEY: OpenAI API key for LLM operations
// ============================================================================
import { createEventBus } from "../src/prototype_helpers/event_bus.js";
import {
  StateGraph,
  Annotation,
  START,
  END,
  interrupt,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { initChatModel } from "langchain/chat_models/universal";
import { Event } from "../src/models/events.js";
import axios from "axios";
import { z } from "zod";
import dotenv from "dotenv";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
dotenv.config();

// =============================================================================
// apps/customer_support_email/models/Email.ts
// =============================================================================
// Email interface
interface Email {
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: Date;
  messageId: string;
}

// =============================================================================
// apps/customer_support_email/models/AgentState.ts
// =============================================================================
// Agent state definition
const AgentState = Annotation.Root({
  email: Annotation<Email>(),
  hasQuestions: Annotation<boolean>(),
  extractedQuestions: Annotation<string[]>(),
  ragResults: Annotation<string[]>(),
  proposedAnswer: Annotation<string>(),
  canAnswerQuestions: Annotation<boolean>(),
  reflectionCount: Annotation<number>(),
  needsImprovement: Annotation<boolean>(),
  proposedReply: Annotation<Email>(),
  userApproval: Annotation<boolean | null>(),
  emailSent: Annotation<boolean>(),
  error: Annotation<string | null>(),
});

type AgentStateType = typeof AgentState.State;

// Initialize OpenAI provider
const llm = await initChatModel("openai:gpt-o4-mini");

// =============================================================================
// apps/customer_support_email/nodes/ExamineForQuestions.ts
// =============================================================================
// Node 1: Examine email for questions
async function examineForQuestions(
  state: AgentStateType,
  config?: Record<string, any>,
): Promise<Partial<AgentStateType>> {
  try {
    const prompt = `
Analyze the following email and determine if it contains questions that require answers.
Look for question marks, interrogative words (who, what, when, where, why, how), or implied questions.

Email Subject: ${state.email.subject}
Email Body: ${state.email.body}

Respond with JSON in this format:
{
  "hasQuestions": boolean,
  "reasoning": "brief explanation"
}`;

    const response = await llm.invoke({
      messages: [{ role: "user", content: prompt }],
      responseFormat: { type: "json_object" },
    });
    const analysis = JSON.parse(response.content);

    return {
      hasQuestions: analysis.hasQuestions,
    };
  } catch (error) {
    console.error("❌ Error examining email:", error);
    return {
      hasQuestions: false,
      error: `Failed to examine email: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// apps/customer_support_email/nodes/ExtractQuestions.ts
// =============================================================================
// Node 2: Extract questions from email
async function extractQuestions(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  try {
    const prompt = `
Extract all questions from the following email. Return them as a JSON array of strings.
Include both explicit questions (with question marks) and implicit questions.

Email Subject: ${state.email.subject}
Email Body: ${state.email.body}

Respond with JSON in this format:
{
  "questions": ["question 1", "question 2", ...]
}`;

    const response = await llm.invoke({
      messages: [{ role: "user", content: prompt }],
      responseFormat: { type: "json_object" },
    });
    const extraction = JSON.parse(response.content);

    return {
      extractedQuestions: extraction.questions,
    };
  } catch (error) {
    console.error("❌ Error extracting questions:", error);
    return {
      extractedQuestions: [],
      error: `Failed to extract questions: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// apps/customer_support_email/nodes/PerformRAGSearch.ts
// =============================================================================
// Node 3: Perform RAG search (stub implementation)
async function performRAGSearch(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  try {
    // Stub implementation - in real implementation, this would query a vector database
    const ragResults: string[] = [];

    for (const question of state.extractedQuestions) {
      // Simulate knowledge base lookup
      const mockResults = await searchKnowledgeBase(question);
      ragResults.push(...mockResults);
    }

    return {
      ragResults,
    };
  } catch (error) {
    console.error("❌ Error performing RAG search:", error);
    return {
      ragResults: [],
      error: `Failed to perform RAG search: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// apps/customer_support_email/nodes/FormulateAnswer.ts
// =============================================================================
// Node 4: Formulate answer
async function formulateAnswer(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const isRefinement = state.reflectionCount > 0;

  try {
    const questionsText = state.extractedQuestions.join("\n- ");
    const contextText = state.ragResults.join("\n\n");

    let prompt = `
Based on the following context from our knowledge base, ${isRefinement ? "improve the existing answer" : "determine if you can answer the customer's questions and provide an appropriate response"}.

Questions:
- ${questionsText}

Knowledge Base Context:
${contextText}

Original Email:
Subject: ${state.email.subject}
Body: ${state.email.body}`;

    if (isRefinement) {
      prompt += `

Current Answer:
${state.proposedAnswer}

Please improve this answer by making it more complete, accurate, clear, helpful, and professional. Focus on addressing the specific areas that need improvement while maintaining the core message.`;
    }

    prompt += `

Analyze whether you have sufficient information to provide helpful answers. Respond with JSON in this exact format:
{
  "canAnswer": boolean,
  "answer": "string - provide a comprehensive ${isRefinement ? "improved " : ""}answer if canAnswer is true, or explain what information is missing if canAnswer is false",
  "reasoning": "string - brief explanation of your decision"
}

If you can answer most or all questions with the provided context, set canAnswer to true.
If critical information is missing or the context is insufficient, set canAnswer to false.`;

    const systemMessage = isRefinement
      ? "You are a helpful assistant that improves customer service responses based on feedback. Always return valid JSON."
      : "You are a helpful assistant that analyzes context and determines if sufficient information exists to answer customer questions. Always return valid JSON.";

    const response = await llm.invoke({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const analysis = JSON.parse(response.content);

    return {
      proposedAnswer: analysis.answer,
      canAnswerQuestions: analysis.canAnswer,
    };
  } catch (error) {
    console.error("❌ Error formulating answer:", error);
    return {
      proposedAnswer:
        "I apologize, but I encountered an error while processing your questions. Please try again or contact support directly.",
      canAnswerQuestions: false,
      error: `Failed to formulate answer: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// apps/customer_support_email/nodes/ReflectOnAnswer.ts
// =============================================================================
// Node 5: Reflection - evaluate and potentially improve the answer
async function reflectOnAnswer(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  try {
    const questionsText = state.extractedQuestions.join("\n- ");
    const contextText = state.ragResults.join("\n\n");

    const prompt = `
You are an expert reviewer evaluating the quality of a customer service response. 

Original Questions:
- ${questionsText}

Available Context:
${contextText}

Current Answer:
${state.proposedAnswer}

Original Email:
Subject: ${state.email.subject}
Body: ${state.email.body}

Evaluate the current answer and determine if it can be improved. Consider:
1. Completeness - Are all questions addressed?
2. Accuracy - Is the information correct based on available context?
3. Clarity - Is the response clear and well-structured?
4. Helpfulness - Does it provide actionable information?
5. Tone - Is it professional and empathetic?

Respond with JSON in this exact format:
{
  "needsImprovement": boolean,
  "reasoning": "string - explain what could be improved or why it's already good",
  "suggestions": "string - specific suggestions for improvement if needsImprovement is true"
}

Set needsImprovement to true only if there are significant improvements that would make the response substantially better.`;

    const response = await llm.invoke({
      messages: [
        {
          role: "system",
          content:
            "You are an expert reviewer that provides constructive feedback on customer service responses. Always return valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const reflection = JSON.parse(response.content);
    const newReflectionCount = state.reflectionCount + 1;

    // If we've reached max iterations, don't improve further
    const shouldImprove = reflection.needsImprovement && newReflectionCount < 3;

    if (newReflectionCount >= 3 && reflection.needsImprovement) {
    }

    return {
      reflectionCount: newReflectionCount,
      needsImprovement: shouldImprove,
    };
  } catch (error) {
    console.error("❌ Error during reflection:", error);
    return {
      reflectionCount: state.reflectionCount + 1,
      needsImprovement: false,
      error: `Failed to reflect on answer: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// apps/customer_support_email/nodes/CreateProposedReply.ts
// =============================================================================
// Node 6: Create proposed email reply
async function createProposedReply(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  try {
    const proposedReply: Email = {
      from: state.email.to, // Reply from the original recipient
      to: state.email.from,
      subject: `Re: ${state.email.subject}`,
      body: `Hi,

Thank you for your email. I've reviewed your questions and here's my response:

${state.proposedAnswer}

Best regards,
AI Assistant`,
      timestamp: new Date(),
      messageId: `reply-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    };

    return {
      proposedReply,
    };
  } catch (error) {
    console.error("❌ Error creating proposed reply:", error);
    return {
      error: `Failed to create proposed reply: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// =============================================================================
// apps/customer_support_email/nodes/HumanApproval.ts
// =============================================================================
// Node 7: Human-in-the-loop interrupt
async function humanApprovalInterrupt(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  // Use LangGraph's interrupt() function to pause execution and wait for user input
  // This creates a proper checkpoint that can be resumed with user approval
  const result = interrupt({
    // Include the proposed reply in the interrupt data so external systems can access it
    hilType: "approval",
    proposedReply: state.proposedReply,
    // Signal that we're waiting for user approval
    awaitingApproval: true,
    // Include any other state that might be needed for decision-making
    email: state.email,
    proposedAnswer: state.proposedAnswer,
  });
  console.log("result of interrupt", result);
  return result;
}

// =============================================================================
// apps/customer_support_email/nodes/SendEmail.ts
// =============================================================================
// Node 8: Send email (LLM-powered with tool)
async function sendEmail(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  try {
    if (!state.userApproval) {
      return {
        emailSent: false,
        error: "Email sending cancelled by user",
      };
    }

    const prompt = `
You are an email formatting specialist. You need to prepare and send an email response to a customer.

Original Customer Email:
From: ${state.email.from}
Subject: ${state.email.subject}
Body: ${state.email.body}

Proposed Reply Content:
${state.proposedAnswer}

Customer Questions Asked:
${state.extractedQuestions.map((q) => `- ${q}`).join("\n")}

Please format an appropriate email response and then send it using the sendEmail tool. Consider:
1. Professional tone and structure
2. Clear subject line (should be "Re: " + original subject)
3. Proper greeting and closing
4. Well-organized content that addresses all questions
5. Appropriate formatting with line breaks

Use the sendEmail tool to send the formatted email. The tool expects:
- to: recipient email address
- subject: email subject line  
- body: formatted email body
- from: sender email (optional)

Respond with JSON indicating the action taken:
{
  "action": "send_email",
  "emailData": {
    "to": "recipient@email.com",
    "subject": "Subject line", 
    "body": "Formatted email body with proper structure",
    "from": "support@company.com"
  }
}`;

    const response = await llm.invoke({
      messages: [
        {
          role: "system",
          content:
            "You are an email formatting specialist. Format professional email responses and use the sendEmail tool to send them. Always return valid JSON with the sendEmail tool call.",
        },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
    });

    const llmResponse = JSON.parse(response.content);

    if (llmResponse.action === "send_email" && llmResponse.emailData) {
      // Use the sendEmail tool
      const result = await sendEmailTool(llmResponse.emailData);

      if (result.success) {
        console.log("✅ Email sent successfully!");
        return {
          emailSent: true,
        };
      } else {
        throw new Error(result.error || "Email sending failed");
      }
    } else {
      throw new Error(
        "LLM did not provide valid email formatting instructions",
      );
    }
  } catch (error) {
    console.error("❌ Error sending email:", error);
    return {
      emailSent: false,
      error: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Stub function for knowledge base search
async function searchKnowledgeBase(question: string): Promise<string[]> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock knowledge base results based on question keywords
  const mockKnowledgeBase = {
    pricing: [
      "Our standard pricing starts at $99/month for the basic plan.",
      "Enterprise pricing includes custom features and 24/7 support.",
      "We offer a 30-day free trial for all new customers.",
    ],
    support: [
      "Technical support is available Monday-Friday 9AM-6PM EST.",
      "Emergency support is available 24/7 for enterprise customers.",
      "You can reach support via email at support@company.com or phone at 1-800-SUPPORT.",
    ],
    features: [
      "Our platform includes advanced analytics and reporting tools.",
      "Integration with 50+ third-party applications is supported.",
      "Custom workflows can be configured to match your business needs.",
    ],
    account: [
      "You can manage your account settings in the user dashboard.",
      "Password resets can be initiated from the login page.",
      "Account upgrades and downgrades take effect immediately.",
    ],
  };

  // Simple keyword matching to simulate semantic search
  const questionLower = question.toLowerCase();
  const results: string[] = [];

  for (const [category, entries] of Object.entries(mockKnowledgeBase)) {
    if (questionLower.includes(category)) {
      results.push(...entries);
    }
  }

  // If no specific matches, return some generic helpful information
  if (results.length === 0) {
    results.push(
      "For specific questions about our services, please visit our documentation at docs.company.com",
      "You can contact our customer success team for personalized assistance.",
    );
  }

  return results.slice(0, 3); // Return top 3 results
}

// Email sending tool function
async function sendEmailTool(emailData: {
  to: string;
  subject: string;
  body: string;
  from?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate 95% success rate
  const success = Math.random() > 0.05;
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  if (success) {
    return { success: true, messageId };
  } else {
    return { success: false, error: "Email service unavailable" };
  }
}

// =============================================================================
// apps/customer_support_email/graph/routing.ts
// =============================================================================
// Conditional routing helper functions
function routeAfterQuestionCheck(state: AgentStateType): string {
  return state.hasQuestions ? "extractQuestions" : END;
}

function routeAfterAnswerFormulation(state: AgentStateType): string {
  return state.canAnswerQuestions ? "reflectOnAnswer" : END;
}

function routeAfterReflection(state: AgentStateType): string {
  return state.needsImprovement ? "formulateAnswer" : "createProposedReply";
}

function routeAfterApproval(state: AgentStateType): string {
  return state.userApproval ? "sendEmail" : END;
}

// =============================================================================
// apps/customer_support_email/graph.ts
// =============================================================================
// createEmailProcessingGraph (graph assembly)
async function createEmailProcessingGraph() {
  // Create a PostgreSQL checkpointer
  const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL || "postgresql://localhost:5432/agents_core",
  );

  // Setup the checkpointer (creates tables if they don't exist)
  await checkpointer.setup();

  const graph = new StateGraph(AgentState)
    // Add nodes
    .addNode("examineForQuestions", examineForQuestions)
    .addNode("extractQuestions", extractQuestions)
    .addNode("performRAGSearch", performRAGSearch)
    .addNode("formulateAnswer", formulateAnswer)
    .addNode("reflectOnAnswer", reflectOnAnswer)
    .addNode("createProposedReply", createProposedReply)
    .addNode("humanApprovalInterrupt", humanApprovalInterrupt)
    .addNode("sendEmail", sendEmail)

    // Define edges
    .addEdge(START, "examineForQuestions")
    .addConditionalEdges("examineForQuestions", routeAfterQuestionCheck)
    .addEdge("extractQuestions", "performRAGSearch")
    .addEdge("performRAGSearch", "formulateAnswer")
    .addConditionalEdges("formulateAnswer", routeAfterAnswerFormulation)
    .addConditionalEdges("reflectOnAnswer", routeAfterReflection)
    .addEdge("createProposedReply", "humanApprovalInterrupt")
    .addConditionalEdges("humanApprovalInterrupt", routeAfterApproval)
    .addEdge("sendEmail", END);

  return graph.compile({
    // Add checkpointing for state persistence
    checkpointer,
  });
}

type ProcessEmailResult = {
  threadId: string;
  interrupted?: boolean;
  interruptData?: any;
};

// kinds of HIL requests:
// - should I do the thing? (yes, no, edit)
// - which of these should I do? ()

const HilState = Annotation.Root({
  kind: Annotation<"options" | "questions" | "approval">(),
  options: Annotation<{ id: string; label: string; description?: string }[]>(),
  questions:
    Annotation<{ id: string; text: string; exampleAnswer?: string }[]>(),
  // --- NEW: store the eventual human response so the parent graph can access it
  response: Annotation<any>(),
  requestPayload: Annotation<Record<string, any>>(),
});
type HilState = typeof HilState.State;

// Helper alias for Hil graph state
type HilGraphState = typeof HilState.State;

// ------------------------------------------------------------
// HIL graph nodes
// ------------------------------------------------------------

// Helper to fetch capability info (schema) once
async function fetchCapabilityInfo(provider: string, capability: string) {
  return await getCapability(provider, capability);
}

// -------- Payload builders --------

async function buildOptionsPayload(
  state: HilGraphState,
  config?: Record<string, any>,
): Promise<Partial<HilGraphState>> {
  try {
    const { hilProvider, hilCapability } = config || ({} as any);
    if (!hilProvider || !hilCapability)
      throw new Error("hilProvider/hilCapability missing");

    const capInfo = await fetchCapabilityInfo(hilProvider, hilCapability);
    const paramsSchema = capInfo.capability?.paramsSchema;

    const prompt =
      `You are a JSON assistant. Produce a JSON object that conforms to the following JSON Schema (no extra keys):\n` +
      `${JSON.stringify(paramsSchema, null, 2)}\n\n` +
      `The action represents asking a human to choose ONE of the following options. Map this to the schema fields appropriately. Options array:\n` +
      `${JSON.stringify(state.options, null, 2)}\n\n` +
      `Return ONLY the JSON payload.`;

    const resp = await llm.createCompletion({
      messages: [
        { role: "system", content: "Output only valid JSON" },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
    });

    return { requestPayload: JSON.parse(resp.content) };
  } catch (error) {
    console.error("❌ buildOptionsPayload error", error);
    return { requestPayload: { error: String(error) } };
  }
}

async function buildQuestionsPayload(
  state: HilGraphState,
  config?: Record<string, any>,
): Promise<Partial<HilGraphState>> {
  try {
    const { hilProvider, hilCapability } = config || ({} as any);
    if (!hilProvider || !hilCapability)
      throw new Error("hilProvider/hilCapability missing");

    const capInfo = await fetchCapabilityInfo(hilProvider, hilCapability);
    const paramsSchema = capInfo.capability?.paramsSchema;

    const prompt =
      `You are a JSON assistant. Produce a JSON object that conforms to this JSON Schema:\n` +
      `${JSON.stringify(paramsSchema, null, 2)}\n\n` +
      `We need to ask the human the following open-ended questions. Use the schema to include them correctly:\n` +
      `${JSON.stringify(state.questions, null, 2)}\n\n` +
      `Return ONLY the JSON payload.`;

    const resp = await llm.createCompletion({
      messages: [
        { role: "system", content: "Output only valid JSON" },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
    });

    return { requestPayload: JSON.parse(resp.content) };
  } catch (error) {
    console.error("❌ buildQuestionsPayload error", error);
    return { requestPayload: { error: String(error) } };
  }
}

async function buildApprovalPayload(
  state: HilGraphState,
  config?: Record<string, any>,
): Promise<Partial<HilGraphState>> {
  try {
    const { hilProvider, hilCapability } = config || ({} as any);
    if (!hilProvider || !hilCapability)
      throw new Error("hilProvider/hilCapability missing");

    const capInfo = await fetchCapabilityInfo(hilProvider, hilCapability);
    const paramsSchema = capInfo.capability?.paramsSchema;

    const prompt =
      `You are a JSON assistant. Produce a JSON object that conforms to the following JSON Schema:\n` +
      `${JSON.stringify(paramsSchema, null, 2)}\n\n` +
      `This is an approval request. The action awaiting approval is described below (free form):\n` +
      `${JSON.stringify({ kind: state.kind }, null, 2)}\n\n` +
      `Return ONLY the JSON payload.`;

    const resp = await llm.createCompletion({
      messages: [
        { role: "system", content: "Output only valid JSON" },
        { role: "user", content: prompt },
      ],
      responseFormat: { type: "json_object" },
    });

    return { requestPayload: JSON.parse(resp.content) };
  } catch (error) {
    console.error("❌ buildApprovalPayload error", error);
    return { requestPayload: { error: String(error) } };
  }
}

// -------- Action & interrupt node --------
async function sendHilRequest(
  state: HilGraphState,
  config?: Record<string, any>,
): Promise<Partial<HilGraphState>> {
  try {
    const { hilProvider, hilCapability, thread_id } = config || ({} as any);
    if (!hilProvider || !hilCapability) {
      throw new Error(
        "hilProvider and hilCapability must be supplied via graph configuration",
      );
    }

    const actionResult = await performAction(
      hilProvider,
      hilCapability,
      state.requestPayload,
    );

    // Emit event
    eventBus.publish(defaultTopic, {
      event_type: "hil_requested",
      run_id: thread_id || "",
      graph_id: "hil_subgraph",
      org_id: "1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      kind: state.kind,
    } as any);

    // interrupt until human reply captured via external system
    return interrupt({ awaitingResponse: true, actionResult });
  } catch (error) {
    console.error("❌ sendHilRequest error", error);
    return { response: { error: String(error) } };
  }
}

// ------------------------------------------------------------
// createHilGraph – builds a reusable sub-graph that can be embedded in other
// workflows. Invocation-time configuration (hilProvider, hilCapability, etc.) is
// passed via `configurable` when the graph is executed.
// ------------------------------------------------------------
async function createHilGraph() {
  const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL || "postgresql://localhost:5432/agents_core",
  );
  await checkpointer.setup();

  const graph = new StateGraph(HilState)
    .addNode("buildOptionsPayload", buildOptionsPayload)
    .addNode("buildQuestionsPayload", buildQuestionsPayload)
    .addNode("buildApprovalPayload", buildApprovalPayload)
    .addNode("sendHilRequest", sendHilRequest)
    // Start routing based on kind
    .addConditionalEdges(START, (state: HilGraphState) => {
      switch (state.kind) {
        case "options":
          return "buildOptionsPayload";
        case "questions":
          return "buildQuestionsPayload";
        case "approval":
        default:
          return "buildApprovalPayload";
      }
    })
    // After building payload, send request
    .addEdge("buildOptionsPayload", "sendHilRequest")
    .addEdge("buildQuestionsPayload", "sendHilRequest")
    .addEdge("buildApprovalPayload", "sendHilRequest")
    .addEdge("sendHilRequest", END);

  return graph.compile({ checkpointer });
}

async function performAction(
  provider: string,
  capability: string,
  request: Record<string, any>,
) {
  const response = await axios.post(
    `${process.env.CONNECT_HUB_URL}/proxy/${provider}/${capability}`,
    request,
  );
  return response.data;
}

async function getCapabilityPrompt(
  provider: string,
  capability: string,
  version: string = "1.0.0",
) {
  const response = await axios.get(
    `${process.env.CONNECT_HUB_URL}/prompt/${provider}/${capability}/${version}`,
  );
  return response.data;
}
async function getCapability(provider: string, capability: string) {
  const response = await axios.get(
    `${process.env.CONNECT_HUB_URL}/capabilities/${provider}/${capability}`,
  );
  return response.data;
}

// Example usage function with checkpointing
async function processEmail(
  email: Email,
  threadId?: string,
): Promise<ProcessEmailResult> {
  const graph = await createEmailProcessingGraph();

  // Generate a unique thread ID if not provided
  const configuredThreadId =
    threadId || `email-${email.messageId}-${Date.now()}`;

  const initialState: AgentStateType = {
    email,
    hasQuestions: false,
    extractedQuestions: [],
    ragResults: [],
    proposedAnswer: "",
    canAnswerQuestions: false,
    reflectionCount: 0,
    needsImprovement: false,
    proposedReply: {} as Email,
    userApproval: null,
    emailSent: false,
    error: null,
  };

  // Run the graph with checkpointing configuration
  const stream = await graph.stream(initialState, {
    configurable: { thread_id: configuredThreadId },
    streamMode: "values",
  });

  for await (const event of stream) {
    const interrupt = event["__interrupt__"];
    if (interrupt) {
      eventBus.publish(defaultTopic, {
        event_type: "hil_requested",
        run_id: configuredThreadId,
        graph_id: "1",
        org_id: "1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        kind: "approval",
      });
    }
  }

  console.log("\n🎯 Workflow completed!");
  return { threadId: configuredThreadId };
}

type ResumeEmailResult = {
  finalState: AgentStateType | null;
  threadId: string;
};

// Function to resume a workflow from a checkpoint
async function resumeEmailWorkflow(
  threadId: string,
  userApproval?: boolean,
): Promise<ResumeEmailResult> {
  const graph = await createEmailProcessingGraph();

  try {
    // If we have user approval, update the state before resuming
    if (userApproval !== undefined) {
      // Update the state with user approval
      await graph.updateState(
        { configurable: { thread_id: threadId } },
        { userApproval },
      );
    }

    // Resume the workflow
    const stream = await graph.stream(null, {
      configurable: { thread_id: threadId },
      streamMode: "values",
    });

    let finalState: AgentStateType | null = null;

    for await (const event of stream) {
      finalState = event;
    }

    return { finalState, threadId };
  } catch (error) {
    console.error("❌ Failed to resume workflow:", error);
    throw error;
  }
}

// Example email for testing - has questions with available knowledge
const sampleEmail: Email = {
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

// Example email with questions that cannot be answered with available knowledge
const complexEmail: Email = {
  from: "enterprise@client.com",
  to: "support@company.com",
  subject: "Technical architecture questions",
  body: `Hello,

We're evaluating your platform for enterprise deployment and need specific technical details:

1. What is your database sharding strategy for multi-tenant environments?
2. How do you handle GDPR compliance for European data residency?
3. What are the specific API rate limits for enterprise tier?
4. Can you provide detailed security audit reports from your SOC 2 certification?

Please provide comprehensive technical documentation.

Best regards,
Technical Team`,
  timestamp: new Date(),
  messageId: "complex-email-456",
};

const defaultTopic = "email-processing";
const eventBus = createEventBus<Event>();
eventBus.subscribe(defaultTopic, async (event) => {
  console.log("🔔 Event received:", event);
  switch (event.event_type) {
    case "hil_requested":
      break;
    case "hil_response":
      break;
    case "run_intent":
      break;
    case "run_started":
      break;
    case "run_completed":
      break;
    default:
      break;
  }
});

interface Capability {
  id: string;
  name: string;
  description: string;
  paramsSchema: object;
  resultSchema: object;
  available: boolean;
}

interface ProviderCapability {
  id: string;
  name: string;
  description: string;
  capabilities: Capability[];
}

///// . new style
async function getCapabilities(): Promise<ProviderCapability[]> {
  const response = await axios.get(
    `${process.env.CONNECT_HUB_URL}/capabilities`,
  );
  return response.data;
}

async function createAgent() {
  const checkpointer = PostgresSaver.fromConnString(
    process.env.DATABASE_URL || "postgresql://localhost:5432/agents_core",
  );
  const capabilities = await getCapabilities();
  const tools = capabilities.flatMap((provider) => {
    return provider.capabilities
      .filter((capability) => capability.available)
      .map((capability) => {
        tool(
          async (args: any, config: RunnableConfig) => {
            const response = await performAction(
              provider.id,
              capability.id,
              args,
            );
            return response;
          },
          {
            name: capability.id,
            description: capability.description,
            schema: capability.paramsSchema,
          },
        );
      });
  });

  const llm = await initChatModel("openai:gpt-o4-mini");

  // Setup the checkpointer (creates tables if they don't exist)
  await checkpointer.setup();
  const agent = createReactAgent({
    llm: llm,
    tools: [],
    checkpointSaver: checkpointer,
  });
}

async function processEmailReact(
  email: Email,
  threadId?: string,
): Promise<void> {}

// Main execution function demonstrating checkpointing
async function main() {
  try {
    await processEmail(sampleEmail);

    //await processEmail(complexEmail);
    await new Promise(() => {});
  } catch (error) {
    console.error("💥 Application error:", error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  createEmailProcessingGraph,
  processEmail,
  resumeEmailWorkflow,
  type Email,
  type AgentStateType,
};
