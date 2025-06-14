import { v4 as generateUuid } from "uuid";
import type {
  MultiAgentSpec,
  TaskDecomposition,
  AgentSpec,
  NodeSpec,
  InterAgentMessage,
  Capability,
} from "./types/index.js";
import type { LLMProvider } from "./types/llm.js";
import {
  promptRegistry,
  type PromptExecution,
} from "./prompts/promptRegistry.js";

interface ConnectIQClient {
  getCapabilities(orgId: string, category?: string): Promise<Capability[]>;
  findCapabilityOrFallback(
    taskDescription: string,
    category?: string,
  ): Promise<Capability>;
}

export class MultiAgentGraphCreator {
  private llmProvider: LLMProvider;
  private connectIQClient: ConnectIQClient;

  constructor(connectIqUrl: string, llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;

    // Simple HTTP client for Connect-IQ service
    this.connectIQClient = {
      async getCapabilities(
        orgId: string,
        category?: string,
      ): Promise<Capability[]> {
        // TODO: Implement actual HTTP call to Connect-IQ service
        // For now, return mock capabilities
        return [
          {
            id: "calendar-management",
            name: "Calendar Management",
            description: "Manage calendar events and scheduling",
            category: "calendar",
            config: {},
          },
          {
            id: "email-communication",
            name: "Email Communication",
            description: "Send and receive emails",
            category: "communication",
            config: {},
          },
          {
            id: "travel-booking",
            name: "Travel Booking",
            description: "Book flights, hotels, and transportation",
            category: "travel",
            config: {},
          },
          {
            id: "finance-tracking",
            name: "Finance Tracking",
            description: "Track expenses and manage budgets",
            category: "finance",
            config: {},
          },
        ];
      },

      async findCapabilityOrFallback(
        taskDescription: string,
        category?: string,
      ): Promise<Capability> {
        const capabilities = await this.getCapabilities("", category);
        // Simple matching - in reality this would be more sophisticated
        const capability = capabilities.find((c) =>
          taskDescription.toLowerCase().includes(c.category.toLowerCase()),
        );

        return (
          capability || {
            id: "general-assistant",
            name: "General Assistant",
            description: "General purpose assistant capability",
            category: "general",
            config: {},
          }
        );
      },
    };
  }

  async createMultiAgentSystem(
    jobDescription: string,
    orgId: string,
    name?: string,
  ): Promise<MultiAgentSpec> {
    // Step 1: Decompose job description into tasks
    const tasks = await this.decomposeJobDescription(jobDescription);

    // Step 2: Group tasks into logical agents
    const agentGroups = await this.identifyAgentGroups(tasks);

    // Step 3: Create agent specifications
    const agents: AgentSpec[] = [];
    for (const [agentName, agentTasks] of Object.entries(agentGroups)) {
      const agentSpec = await this.createAgentFromTasks(
        agentName,
        agentTasks,
        orgId,
      );
      agents.push(agentSpec);
    }

    // Step 4: Identify inter-agent communication
    const messages = this.identifyInterAgentCommunication(agents, tasks);

    // Step 5: Create complete specification
    const spec: MultiAgentSpec = {
      version: "0.1.0",
      jobDescription,
      agents,
      interAgentMessages: messages,
      executionMode: "event-driven",
    };

    return spec;
  }

  async decomposeJobDescription(
    jobDescription: string,
    promptVersion?: string,
  ): Promise<TaskDecomposition[]> {
    const executionId = generateUuid();
    const startTime = Date.now();

    try {
      // Get prompt from registry
      const promptTemplate = promptRegistry.getPrompt(
        "job-decomposition",
        promptVersion,
      );
      if (!promptTemplate) {
        throw new Error("Job decomposition prompt not found");
      }

      // Interpolate variables
      const prompt = promptRegistry.interpolatePrompt(promptTemplate, {
        jobDescription,
      });

      const response = await this.llmProvider.createCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at decomposing complex jobs into manageable tasks for AI agents. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });

      const content = response.content;
      if (!content) {
        throw new Error("No response from LLM provider");
      }

      const parsed = JSON.parse(content);
      const tasks = parsed.tasks || [];

      // Record successful execution
      await promptRegistry.recordExecution({
        promptId: "job-decomposition",
        version: promptTemplate.version,
        variables: { jobDescription },
        response: tasks,
        success: true,
        responseTimeMs: Date.now() - startTime,
        qualityScore: this.evaluateDecompositionQuality(tasks),
        timestamp: new Date(),
        executionId,
      });

      return tasks;
    } catch (error) {
      console.error("Error decomposing job description:", error);

      // Record failed execution
      const promptTemplate = promptRegistry.getPrompt(
        "job-decomposition",
        promptVersion,
      );
      if (promptTemplate) {
        await promptRegistry.recordExecution({
          promptId: "job-decomposition",
          version: promptTemplate.version,
          variables: { jobDescription },
          response: null,
          success: false,
          responseTimeMs: Date.now() - startTime,
          timestamp: new Date(),
          executionId,
        });
      }

      // Fallback to simple decomposition
      return [
        {
          taskDescription: jobDescription,
          category: "general",
          priority: 3,
          dependencies: [],
          estimatedComplexity: "medium",
          requiredCapabilities: ["general-assistant"],
        },
      ];
    }
  }

  private async identifyAgentGroups(
    tasks: TaskDecomposition[],
    promptVersion?: string,
  ): Promise<Record<string, TaskDecomposition[]>> {
    const executionId = generateUuid();
    const startTime = Date.now();

    try {
      // Get prompt from registry
      const promptTemplate = promptRegistry.getPrompt(
        "agent-grouping",
        promptVersion,
      );
      if (!promptTemplate) {
        throw new Error("Agent grouping prompt not found");
      }

      // Interpolate variables
      const prompt = promptRegistry.interpolatePrompt(promptTemplate, {
        tasks: JSON.stringify(tasks, null, 2),
      });

      const response = await this.llmProvider.createCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at organizing tasks into cohesive agent responsibilities. Always return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        maxTokens: 1500,
      });

      const content = response.content;
      if (!content) {
        throw new Error("No response from LLM provider");
      }

      const agentGroups = JSON.parse(content);

      // Convert task descriptions back to task objects
      const result: Record<string, TaskDecomposition[]> = {};
      for (const [agentName, taskDescriptions] of Object.entries(agentGroups)) {
        result[agentName] = (taskDescriptions as string[])
          .map((desc) => tasks.find((t) => t.taskDescription === desc))
          .filter(Boolean) as TaskDecomposition[];
      }

      // Record successful execution
      await promptRegistry.recordExecution({
        promptId: "agent-grouping",
        version: promptTemplate.version,
        variables: { tasks: JSON.stringify(tasks) },
        response: result,
        success: true,
        responseTimeMs: Date.now() - startTime,
        qualityScore: this.evaluateGroupingQuality(result, tasks),
        timestamp: new Date(),
        executionId,
      });

      return result;
    } catch (error) {
      console.error("Error grouping tasks into agents:", error);

      // Record failed execution
      const promptTemplate = promptRegistry.getPrompt(
        "agent-grouping",
        promptVersion,
      );
      if (promptTemplate) {
        await promptRegistry.recordExecution({
          promptId: "agent-grouping",
          version: promptTemplate.version,
          variables: { tasks: JSON.stringify(tasks) },
          response: null,
          success: false,
          responseTimeMs: Date.now() - startTime,
          timestamp: new Date(),
          executionId,
        });
      }

      // Fallback: create one agent per task
      const result: Record<string, TaskDecomposition[]> = {};
      tasks.forEach((task, index) => {
        result[`Agent ${index + 1}`] = [task];
      });
      return result;
    }
  }

  private evaluateDecompositionQuality(tasks: TaskDecomposition[]): number {
    let score = 5; // Base score

    // Score based on number of tasks (sweet spot is 3-8 tasks)
    if (tasks.length >= 3 && tasks.length <= 8) {
      score += 2;
    } else if (tasks.length < 3) {
      score -= 1;
    } else if (tasks.length > 12) {
      score -= 2;
    }

    // Score based on dependency richness
    const totalDependencies = tasks.reduce(
      (sum, task) => sum + task.dependencies.length,
      0,
    );
    if (totalDependencies > 0) {
      score += Math.min(2, totalDependencies / tasks.length); // Max 2 points
    }

    // Score based on capability specificity
    const specificCapabilities = tasks.filter((task) =>
      task.requiredCapabilities.some((cap) => cap !== "general-assistant"),
    ).length;
    score += (specificCapabilities / tasks.length) * 1; // Max 1 point

    return Math.min(10, Math.max(0, score));
  }

  private evaluateGroupingQuality(
    groups: Record<string, TaskDecomposition[]>,
    allTasks: TaskDecomposition[],
  ): number {
    let score = 5; // Base score

    const groupCount = Object.keys(groups).length;
    const taskCount = allTasks.length;

    // Score based on grouping efficiency (not too many tiny groups)
    if (groupCount <= taskCount / 2) {
      score += 2;
    } else {
      score -= 1;
    }

    // Score based on task distribution
    const tasksPerGroup = Object.values(groups).map((tasks) => tasks.length);
    const avgTasksPerGroup = taskCount / groupCount;
    const variance =
      tasksPerGroup.reduce(
        (sum, count) => sum + Math.pow(count - avgTasksPerGroup, 2),
        0,
      ) / groupCount;

    if (variance < 2) {
      // Well-distributed
      score += 1;
    }

    // Score based on category coherence within groups
    let coherenceScore = 0;
    for (const groupTasks of Object.values(groups)) {
      const categories = [...new Set(groupTasks.map((t) => t.category))];
      if (categories.length === 1) {
        coherenceScore += 1;
      } else if (categories.length <= 2) {
        coherenceScore += 0.5;
      }
    }
    score += (coherenceScore / groupCount) * 2; // Max 2 points

    return Math.min(10, Math.max(0, score));
  }

  private async createAgentFromTasks(
    agentName: string,
    tasks: TaskDecomposition[],
    orgId: string,
  ): Promise<AgentSpec> {
    // Get required capabilities for all tasks
    const allCapabilities = [
      ...new Set(tasks.flatMap((t) => t.requiredCapabilities)),
    ];

    // Create nodes for each capability
    const nodes: NodeSpec[] = [];
    for (const capabilityName of allCapabilities) {
      try {
        const capability = await this.connectIQClient.findCapabilityOrFallback(
          capabilityName,
          tasks[0]?.category,
        );

        nodes.push({
          id: generateUuid(),
          type: "capability",
          config: {
            capabilityId: capability.id,
            capabilityName: capability.name,
            description: capability.description,
            category: capability.category,
            parameters: capability.config,
          },
        });
      } catch (error) {
        console.error(`Error getting capability ${capabilityName}:`, error);
        // Add fallback node
        nodes.push({
          id: generateUuid(),
          type: "capability",
          config: {
            capabilityId: "general-assistant",
            capabilityName: "General Assistant",
            description: `Fallback capability for ${capabilityName}`,
            category: "general",
            parameters: {},
          },
        });
      }
    }

    // Create simple linear flow between nodes
    const edges: string[][] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push([nodes[i]!.id, nodes[i + 1]!.id]);
    }

    return {
      id: generateUuid(),
      name: agentName,
      description: `Agent responsible for: ${tasks.map((t) => t.taskDescription).join(", ")}`,
      category: tasks[0]?.category || "general",
      nodes,
      edges,
      specification: {
        tasks: tasks.map((t) => t.taskDescription),
        capabilities: allCapabilities,
        priority: Math.max(...tasks.map((t) => t.priority)),
        complexity: this.determineOverallComplexity(tasks),
      },
    };
  }

  private identifyInterAgentCommunication(
    agents: AgentSpec[],
    tasks: TaskDecomposition[],
  ): InterAgentMessage[] {
    const messages: InterAgentMessage[] = [];

    // Find tasks with dependencies that cross agent boundaries
    for (const task of tasks) {
      if (task.dependencies.length === 0) continue;

      const taskAgent = agents.find((a) =>
        a.specification?.tasks?.includes(task.taskDescription),
      );

      if (!taskAgent) continue;

      for (const dependency of task.dependencies) {
        const dependencyAgent = agents.find((a) =>
          a.specification?.tasks?.includes(dependency),
        );

        if (dependencyAgent && dependencyAgent.id !== taskAgent.id) {
          messages.push({
            from: dependencyAgent.id,
            to: taskAgent.id,
            messageType: "task_completion",
            schema: {
              type: "object",
              properties: {
                taskId: { type: "string" },
                result: { type: "object" },
                status: { type: "string", enum: ["completed", "failed"] },
                timestamp: { type: "string", format: "date-time" },
              },
              required: ["taskId", "result", "status", "timestamp"],
            },
          });
        }
      }
    }

    return messages;
  }

  private determineOverallComplexity(tasks: TaskDecomposition[]): string {
    const complexityScores = {
      simple: 1,
      medium: 2,
      complex: 3,
    };

    const avgComplexity =
      tasks.reduce(
        (sum, task) => sum + complexityScores[task.estimatedComplexity],
        0,
      ) / tasks.length;

    if (avgComplexity <= 1.5) return "simple";
    if (avgComplexity <= 2.5) return "medium";
    return "complex";
  }

  // Method to test different prompt versions
  async testPromptVersion(
    jobDescription: string,
    promptId: string,
    version: string,
    iterations: number = 1,
  ): Promise<any> {
    const results = [];

    for (let i = 0; i < iterations; i++) {
      if (promptId === "job-decomposition") {
        const result = await this.decomposeJobDescription(
          jobDescription,
          version,
        );
        results.push(result);
      }
      // Add other prompt types as needed
    }

    return {
      promptId,
      version,
      iterations,
      results,
      metrics: promptRegistry.getPerformanceMetrics(promptId, version),
    };
  }
}
