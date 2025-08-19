import { tool, ToolRunnableConfig } from "@langchain/core/tools";
import { StateGraph, START, END, Send, Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  createReactAgent,
  createReactAgentAnnotation,
} from "@langchain/langgraph/prebuilt";
import {
  Configuration as ConnectHubConfig,
  CapabilitiesApi,
  TriggersApi,
  Trigger,
  ProviderCapabilities,
} from "@ewestern/connect_hub_sdk";
import {
  Configuration as AgentCoreConfig,
  EmployeesApi,
  AgentsApi,
  Employee,
  EmployeeStatus,
  Agent,
  AgentStatus,
} from "@ewestern/agents_core_sdk";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { CompiledStateGraph } from "@langchain/langgraph";
import { Static, Type } from "@sinclair/typebox";

// Prompts for LLM agents
const BUNDLE_CREATOR_PROMPT = `
You are an expert at creating test bundles for AI agent capabilities and triggers.

Your goal is to create comprehensive test coverage by:
1. Using the get_capabilities and get_triggers tools to fetch available integrations
2. Creating test bundles that exercise capabilities with appropriate triggers
3. Ensuring broad coverage while being practical and safe

STRATEGY:
- Prefer 1 capability per bundle for clear, focused testing
- Use the internal "cron" trigger as default for most capabilities (provides reliable scheduled testing)
- Ensure at least one bundle tests each non-internal trigger (webhooks, email events, etc.)
- Avoid destructive operations (delete, remove, destroy) unless explicitly allowed
- For triggers requiring parameters, use safe defaults or skip complex schemas

BUNDLE STRUCTURE:
Each bundle should have:
- A unique ID following pattern: test:<providerId>/<capabilityId>[@<triggerId>]
- Descriptive name and purpose
- 1-3 capabilities max (prefer 1 for reliability)  
- Appropriate trigger with safe parameters
- Clear test objective

You MUST call both get_capabilities and get_triggers before generating bundles.
Prioritize safety and coverage over complex multi-step workflows.
`;

const PROMPT_BUILDER_PROMPT = `
You are an expert at creating prompts for AI test agents.

You will be given a test bundle containing:
- Capabilities to exercise
- Trigger that activates the agent  
- Test context and constraints

Create a clear, actionable prompt that:
1. Explains the agent's testing purpose
2. Specifies exactly which capabilities to use and in what order
3. Includes safety constraints and test markers
4. Provides specific guidance for the capability types involved
5. Ensures minimal, non-destructive testing

SAFETY REQUIREMENTS:
- Add "[TEST]" prefix to any content created
- Use provided test email addresses for email capabilities  
- Perform minimal operations that verify connectivity/functionality
- Log success/failure of each capability call
- Avoid any irreversible operations

CAPABILITY-SPECIFIC GUIDANCE:
- Read/Get/List: Fetch small amount of data, verify response format
- Send/Create/Post: Use test data with clear test markers
- Update/Modify: Use non-critical test records only
- Delete/Remove: Skip unless explicitly allowed and on test data only

The prompt should be precise enough that the agent knows exactly what to do when triggered.
`;

// Types and schemas
const TestBundleSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  capabilities: Type.Array(
    Type.Object({
      providerId: Type.String(),
      id: Type.String(),
      description: Type.String(),
    })
  ),
  trigger: Type.Object({
    providerId: Type.String(),
    id: Type.String(),
    triggerParams: Type.Unknown(),
    description: Type.String(),
  }),
  prompt: Type.Optional(Type.String()),
});

const AgentSpecSchema = Type.Object({
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
    triggerParams: Type.Unknown(),
  }),
  prompt: Type.String(),
});

const UnsatisfiedSpecSchema = Type.Object({
  bundleId: Type.String(),
  reason: Type.String(),
  description: Type.String(),
});

// State for main graph
const GraphState = Annotation.Root({
  ...createReactAgentAnnotation().spec,
  bundles: Annotation<Static<typeof TestBundleSchema>[]>({
    reducer: (acc, curr) => [...acc, ...curr],
    default: () => [],
  }),
  agents: Annotation<Static<typeof AgentSpecSchema>[]>({
    reducer: (acc, curr) => [...acc, ...curr],
    default: () => [],
  }),
  unsatisfied: Annotation<Static<typeof UnsatisfiedSpecSchema>[]>({
    reducer: (acc, curr) => [...acc, ...curr],
    default: () => [],
  }),
});

// State for subgraph
const SubgraphState = Annotation.Root({
  bundle: Annotation<Static<typeof TestBundleSchema>>({
    reducer: (acc, curr) => curr,
  }),
  agent: Annotation<Static<typeof AgentSpecSchema> | null>({
    reducer: (acc, curr) => curr,
    default: () => null,
  }),
  unsatisfied: Annotation<Static<typeof UnsatisfiedSpecSchema> | null>({
    reducer: (acc, curr) => curr,
    default: () => null,
  }),
});

interface TestEmployeeConfig {
  agentCoreApiUrl: string;
  agentCoreToken: string;
  connectHubApiUrl: string;
  connectHubToken: string;
  orgId: string;
  userId: string;
  employeeName: string;
  employeeId?: string;
  cronSchedule?: string;
  testSafeEmail?: string;
  model?: string;
  allowDestructive?: boolean;
  prune?: boolean;
  dryRun?: boolean;
  createIfMissing?: boolean;
  //checkpointerDbUrl: string;
}

export class TestEmployeeCreator {
  private config: TestEmployeeConfig;
  //private checkpointer: PostgresSaver;
  private connectHubApi: CapabilitiesApi;
  private triggersApi: TriggersApi;
  private employeesApi: EmployeesApi;
  private agentsApi: AgentsApi;

  public BUNDLE_CREATOR = "bundle_creator";
  public PROMPT_BUILDER = "prompt_builder";
  public JOIN = "join";

  constructor(config: TestEmployeeConfig) {
    this.config = config;
    //this.checkpointer = PostgresSaver.fromConnString(config.checkpointerDbUrl);

    const connectHubConfig = new ConnectHubConfig({
      basePath: config.connectHubApiUrl,
      accessToken: config.connectHubToken,
    });
    this.connectHubApi = new CapabilitiesApi(connectHubConfig);
    this.triggersApi = new TriggersApi(connectHubConfig);

    const agentCoreConfig = new AgentCoreConfig({
      basePath: config.agentCoreApiUrl,
      accessToken: config.agentCoreToken,
    });
    this.employeesApi = new EmployeesApi(agentCoreConfig);
    this.agentsApi = new AgentsApi(agentCoreConfig);
  }

  async getLLM() {
    if (!this.config.model) {
      throw new Error("MODEL environment variable is required for LLM-based bundle and prompt generation");
    }
    return new ChatAnthropic({
      model: this.config.model,
      temperature: 0.0,
    });
  }

  async createGraph() {
    const builder = new StateGraph(GraphState)
      .addNode(this.BUNDLE_CREATOR, this.bundleCreatorAgent.bind(this))
      .addNode(this.PROMPT_BUILDER, this.promptBuilderSubgraph.bind(this))
      .addNode(this.JOIN, this.joiner.bind(this))
      .addEdge(START, this.BUNDLE_CREATOR)
      .addConditionalEdges(this.BUNDLE_CREATOR, this.fanOut.bind(this))
      .addEdge(this.PROMPT_BUILDER, this.JOIN)
      .addEdge(this.JOIN, END);

    //return builder.compile({ checkpointer: this.checkpointer });
    return builder.compile();
  }

  fanOut(state: typeof GraphState.State) {
    return state.bundles.map((bundle) => {
      return new Send(this.PROMPT_BUILDER, { bundle });
    });
  }

  joiner(state: typeof GraphState.State) {
    console.log("Aggregated results:", {
      agents: state.agents.length,
      unsatisfied: state.unsatisfied.length,
    });
    return state;
  }

  async bundleCreatorAgent(state: typeof GraphState.State) {
    const llm = await this.getLLM();
    if (!llm) {
      throw new Error("LLM model is required for bundle creation. Set MODEL environment variable.");
    }

    const agent = createReactAgent({
      name: "bundle_creator",
      llm: llm,
      tools: [this.getCapabilitiesTool(), this.getTriggersTool()],
      checkpointer: this.checkpointer,
      prompt: BUNDLE_CREATOR_PROMPT,
      responseFormat: Type.Object({
        bundles: Type.Array(TestBundleSchema),
      }),
    });

    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: `Create test bundles for all available capabilities and triggers. 
          
          Configuration:
          - Allow destructive operations: ${this.config.allowDestructive}
          - Cron schedule preference: ${this.config.cronSchedule || "0 */15 * * * *"}
          - Test email: ${this.config.testSafeEmail || "test@example.com"}
          
          Ensure comprehensive coverage while prioritizing safety and reliability.`,
        },
      ],
    });

    console.log(`Created ${result.structuredResponse.bundles.length} test bundles`);
    return { bundles: result.structuredResponse.bundles };
  }



  async promptBuilderSubgraph(state: { bundle: Static<typeof TestBundleSchema> }) {
    const llm = await this.getLLM();

    const agent = createReactAgent({
      name: "prompt_builder",
      llm: llm,
      tools: [], // No tools needed for prompt building
      checkpointer: this.checkpointer,
      prompt: PROMPT_BUILDER_PROMPT,
      responseFormat: Type.Object({
        agent: AgentSpecSchema,
      }),
    });

    const result = await agent.invoke({
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            bundle: state.bundle,
            config: {
              testSafeEmail: this.config.testSafeEmail || "test@example.com",
              allowDestructive: this.config.allowDestructive,
            },
          }),
        },
      ],
    });

    return {
      agents: [result.structuredResponse.agent],
      unsatisfied: [],
    };
  }

  async executeCreateOrUpdate(): Promise<void> {
    await this.checkpointer.setup();
    const graph = await this.createGraph();

    console.log("Running test employee creation/update...");
    
    // Run the graph to generate agent specs
    const result = await graph.invoke(
      { messages: [{ role: "user", content: "Generate test bundles" }] },
      { recursionLimit: 50 }
    );

    const agentSpecs = result.agents as Static<typeof AgentSpecSchema>[];
    const unsatisfied = result.unsatisfied as Static<typeof UnsatisfiedSpecSchema>[];

    console.log(`Generated ${agentSpecs.length} agent specs, ${unsatisfied.length} unsatisfied`);

    if (this.config.dryRun) {
      console.log("\n--- DRY RUN MODE ---");
      console.log("Would create/update agents:");
      agentSpecs.forEach(spec => {
        console.log(`- ${spec.name}: ${spec.description}`);
      });
      if (unsatisfied.length > 0) {
        console.log("\nUnsatisfied bundles:");
        unsatisfied.forEach(spec => {
          console.log(`- ${spec.bundleId}: ${spec.reason}`);
        });
      }
      return;
    }

    // Execute the create or update
    if (this.config.employeeId) {
      await this.updateExistingEmployee(this.config.employeeId, agentSpecs);
    } else {
      await this.createNewEmployee(agentSpecs);
    }
  }

  async createNewEmployee(agentSpecs: Static<typeof AgentSpecSchema>[]): Promise<void> {
    console.log(`Creating new employee: ${this.config.employeeName}`);

    const employeeData: Employee = {
      orgId: this.config.orgId,
      userId: this.config.userId,
      name: this.config.employeeName,
      status: EmployeeStatus.Active,
      agents: agentSpecs.map(spec => ({
        orgId: this.config.orgId,
        userId: this.config.userId,
        name: spec.name,
        description: spec.description,
        status: AgentStatus.Active,
        capabilities: spec.capabilities as any,
        trigger: spec.trigger as any,
        prompt: spec.prompt,
      })),
    };

    try {
      const createdEmployee = await this.employeesApi.v1EmployeesPost({
        employee: employeeData,
      });
      console.log(`✅ Created employee ${createdEmployee.id} with ${createdEmployee.agents.length} agents`);
    } catch (error) {
      console.error("❌ Failed to create employee:", error);
      throw error;
    }
  }

  async updateExistingEmployee(employeeId: string, agentSpecs: Static<typeof AgentSpecSchema>[]): Promise<void> {
    console.log(`Updating existing employee: ${employeeId}`);

    try {
      // Get existing employee
      const existingEmployee = await this.employeesApi.v1EmployeesIdGet({ id: employeeId });
      console.log(`Found existing employee with ${existingEmployee.agents.length} agents`);

      // Create a map of existing agents by name
      const existingAgentMap = new Map<string, Agent>();
      existingEmployee.agents.forEach(agent => {
        existingAgentMap.set(agent.name, agent);
      });

      let created = 0;
      let updated = 0;
      let skipped = 0;

      // Process each agent spec
      for (const spec of agentSpecs) {
        const existingAgent = existingAgentMap.get(spec.name);

        if (!existingAgent) {
          // Create new agent
          await this.createAgent(spec, employeeId);
          created++;
        } else {
          // Check if update is needed
          if (this.needsUpdate(existingAgent, spec)) {
            await this.updateAgent(existingAgent.id!, spec);
            updated++;
          } else {
            skipped++;
          }
        }
      }

      console.log(`✅ Update complete: ${created} created, ${updated} updated, ${skipped} skipped`);

      // Optional: prune stale agents
      if (this.config.prune) {
        await this.pruneStaleAgents(existingEmployee, agentSpecs);
      }

    } catch (error) {
      if (error.message?.includes('404') && this.config.createIfMissing) {
        console.log("Employee not found, creating new one...");
        await this.createNewEmployee(agentSpecs);
      } else {
        console.error("❌ Failed to update employee:", error);
        throw error;
      }
    }
  }

  async createAgent(spec: Static<typeof AgentSpecSchema>, employeeId: string): Promise<void> {
    const agentData: Agent = {
      orgId: this.config.orgId,
      userId: this.config.userId,
      employeeId,
      name: spec.name,
      description: spec.description,
      status: AgentStatus.Active,
      capabilities: spec.capabilities as any,
      trigger: spec.trigger as any,
      prompt: spec.prompt,
    };

    const createdAgent = await this.agentsApi.v1AgentsPost({
      agent: agentData,
    });

    // Register trigger
    await this.registerTrigger(createdAgent);
    console.log(`✅ Created agent: ${spec.name}`);
  }

  async updateAgent(agentId: string, spec: Static<typeof AgentSpecSchema>): Promise<void> {
    const updateData = {
      name: spec.name,
      description: spec.description,
      capabilities: spec.capabilities as any,
      trigger: spec.trigger as any,
      prompt: spec.prompt,
    };

    const updatedAgent = await this.agentsApi.v1AgentsIdPut({
      id: agentId,
      v1AgentsIdPutRequest: updateData,
    });

    // Re-register trigger (in case trigger or params changed)
    await this.registerTrigger(updatedAgent);
    console.log(`✅ Updated agent: ${spec.name}`);
  }

  async registerTrigger(agent: Agent): Promise<void> {
    try {
      await this.triggersApi.triggerRegistrationsPost({
        triggerRegistration: {
          orgId: agent.orgId,
          agentId: agent.id!,
          params: agent.trigger.triggerParams,
          providerId: agent.trigger.providerId,
          triggerId: agent.trigger.id,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days
        },
      });
    } catch (error) {
      console.warn(`⚠️ Failed to register trigger for agent ${agent.name}:`, error);
    }
  }

  needsUpdate(existingAgent: Agent, spec: Static<typeof AgentSpecSchema>): boolean {
    // Check if key fields differ
    if (existingAgent.description !== spec.description) return true;
    if (existingAgent.prompt !== spec.prompt) return true;
    
    // Check capabilities
    if (JSON.stringify(existingAgent.capabilities) !== JSON.stringify(spec.capabilities)) return true;
    
    // Check trigger
    if (JSON.stringify(existingAgent.trigger) !== JSON.stringify(spec.trigger)) return true;
    
    return false;
  }

  async pruneStaleAgents(existingEmployee: Employee, agentSpecs: Static<typeof AgentSpecSchema>[]): Promise<void> {
    const specNames = new Set(agentSpecs.map(spec => spec.name));
    const staleAgents = existingEmployee.agents.filter(
      agent => agent.name.startsWith("Test ") && !specNames.has(agent.name)
    );

    for (const staleAgent of staleAgents) {
      try {
        await this.agentsApi.v1AgentsIdDelete({ id: staleAgent.id! });
        console.log(`🗑️ Pruned stale agent: ${staleAgent.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to prune agent ${staleAgent.name}:`, error);
      }
    }
  }

  getCapabilitiesTool() {
    return tool(
      async (input: any, config: RunnableConfig) => {
        const capabilities = await this.connectHubApi.capabilitiesGet();
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
      },
      {
        name: "get_capabilities",
        description: "Get all available capabilities for testing",
        schema: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
      }
    );
  }

  getTriggersTool() {
    return tool(
      async (input: any, config: RunnableConfig) => {
        const triggers = await this.triggersApi.triggersGet();
        return {
          triggers: triggers.map((trigger) => ({
            id: trigger.id,
            providerId: trigger.providerId,
            description: trigger.description,
            paramsSchema: trigger.paramsSchema,
          })),
        };
      },
      {
        name: "get_triggers",
        description: "Get all available triggers for agent activation",
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

// CLI execution
async function main() {
  const config: TestEmployeeConfig = {
    agentCoreApiUrl: process.env.AGENT_CORE_API_URL!,
    agentCoreToken: process.env.AGENT_CORE_TOKEN!,
    connectHubApiUrl: process.env.CONNECT_HUB_API_URL!,
    connectHubToken: process.env.CONNECT_HUB_TOKEN!,
    orgId: process.env.ORG_ID!,
    userId: process.env.USER_ID!,
    employeeName: process.env.EMPLOYEE_NAME || "Integration Test Employee",
    employeeId: process.env.EMPLOYEE_ID,
    cronSchedule: process.env.CRON_SCHEDULE,
    testSafeEmail: process.env.TEST_SAFE_EMAIL,
    model: process.env.MODEL!,
    allowDestructive: process.env.ALLOW_DESTRUCTIVE === "true",
    prune: process.env.PRUNE === "true",
    dryRun: process.env.DRY_RUN === "true",
    createIfMissing: process.env.CREATE_IF_MISSING === "true",
  };

  // Validate required config
  const required = [
    'agentCoreApiUrl', 'agentCoreToken', 'connectHubApiUrl', 
    'connectHubToken', 'orgId', 'userId', 'model'
  ];
  
  for (const field of required) {
    if (!config[field as keyof TestEmployeeConfig]) {
      console.error(`❌ Missing required environment variable: ${field.toUpperCase()}`);
      process.exit(1);
    }
  }

  try {
    const creator = new TestEmployeeCreator(config);
    await creator.executeCreateOrUpdate();
  } catch (error) {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
