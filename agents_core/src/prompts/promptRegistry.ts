import { PromptTemplate } from "../models/index.js";

export interface PromptExecution {
  promptId: string;
  version: string;
  variables: Record<string, any>;
  response: any;
  success: boolean;
  responseTimeMs: number;
  qualityScore?: number;
  timestamp: Date;
  executionId: string;
}

export class PromptRegistry {
  private prompts = new Map<string, PromptTemplate[]>();
  private activeVersions = new Map<string, string>();

  constructor(private db?: any) {
    this.loadPrompts();
  }

  private loadPrompts() {
    // Register all available prompts
    this.registerPrompt({
      id: "job-decomposition",
      name: "Job Description Decomposition",
      version: "v1.0.0",
      content: `Break down this job description into distinct, manageable tasks that could be handled by specialized AI agents:

Job Description: {{jobDescription}}

Return a JSON array of tasks with the following structure:
{
  "tasks": [
    {
      "taskDescription": "Clear, specific description of what needs to be done",
      "category": "calendar|travel|finance|communication|admin|research|general",
      "priority": 1-5,
      "dependencies": ["list of other task descriptions this depends on"],
      "estimatedComplexity": "simple|medium|complex",
      "requiredCapabilities": ["specific capabilities needed"]
    }
  ]
}

Guidelines:
- Break complex tasks into smaller, atomic tasks
- Identify clear dependencies between tasks
- Categorize based on the type of work
- Be specific about required capabilities
- Keep task descriptions actionable and clear`,
      variables: ["jobDescription"],
      metadata: {
        description:
          "Decomposes job descriptions into structured tasks for agent assignment",
        author: "system",
        createdAt: new Date().toISOString(),
        tags: ["decomposition", "planning", "tasks"],
        modelRecommendations: ["gpt-4", "gpt-3.5-turbo"],
      },
    });

    this.registerPrompt({
      id: "job-decomposition",
      name: "Job Description Decomposition",
      version: "v1.1.0",
      content: `You are an expert project manager. Break down this job description into distinct, manageable tasks for AI agents.

Job Description: {{jobDescription}}

Consider the following when decomposing:
1. Task granularity should be appropriate for automation
2. Dependencies must be clearly identified
3. Required capabilities should be specific and actionable

Return a JSON array:
{
  "tasks": [
    {
      "taskDescription": "Specific, actionable task description",
      "category": "calendar|travel|finance|communication|admin|research|general",
      "priority": 1-5,
      "dependencies": ["exact task descriptions this depends on"],
      "estimatedComplexity": "simple|medium|complex",
      "requiredCapabilities": ["specific capability names"],
      "estimatedDuration": "estimated time in minutes",
      "success_criteria": "how to measure if task is complete"
    }
  ]
}`,
      variables: ["jobDescription"],
      metadata: {
        description:
          "Enhanced decomposition with duration estimates and success criteria",
        author: "system",
        createdAt: new Date().toISOString(),
        tags: ["decomposition", "planning", "tasks", "enhanced"],
        modelRecommendations: ["gpt-4"],
      },
    });

    this.registerPrompt({
      id: "agent-grouping",
      name: "Task to Agent Grouping",
      version: "v1.0.0",
      content: `Given these tasks, group them into logical agents that should work together. Each agent should have a cohesive set of responsibilities.

Tasks: {{tasks}}

Return a JSON object where keys are agent names and values are arrays of task descriptions that agent should handle:
{
  "Agent Name": ["task description 1", "task description 2"],
  "Another Agent": ["task description 3"]
}

Guidelines:
- Group related tasks together
- Keep agents focused on specific domains
- Ensure good separation of concerns
- Use descriptive agent names`,
      variables: ["tasks"],
      metadata: {
        description: "Groups tasks into logical agent responsibilities",
        author: "system",
        createdAt: new Date().toISOString(),
        tags: ["grouping", "agents", "organization"],
        modelRecommendations: ["gpt-4", "gpt-3.5-turbo"],
      },
    });

    // Set default active versions
    this.setActiveVersion("job-decomposition", "v1.0.0");
    this.setActiveVersion("agent-grouping", "v1.0.0");
  }

  registerPrompt(prompt: PromptTemplate): void {
    // Validate the prompt against the schema
    try {
      const isValid = this.validatePromptTemplate(prompt);
      if (!isValid) {
        throw new Error(`Invalid prompt template: ${JSON.stringify(prompt)}`);
      }
    } catch (error) {
      console.error("Error validating prompt template:", error);
      throw error;
    }

    const existing = this.prompts.get(prompt.id) || [];
    existing.push(prompt);
    this.prompts.set(prompt.id, existing);
  }

  private validatePromptTemplate(prompt: any): prompt is PromptTemplate {
    // Basic validation - in a real implementation, you might use a TypeBox validator
    // For now, we'll do simple type checking
    return (
      typeof prompt.id === "string" &&
      typeof prompt.name === "string" &&
      typeof prompt.version === "string" &&
      typeof prompt.content === "string" &&
      Array.isArray(prompt.variables) &&
      typeof prompt.metadata === "object" &&
      typeof prompt.metadata.description === "string" &&
      typeof prompt.metadata.author === "string" &&
      typeof prompt.metadata.createdAt === "string"
    );
  }

  getPrompt(id: string, version?: string): PromptTemplate | null {
    const prompts = this.prompts.get(id);
    if (!prompts) return null;

    if (version) {
      return prompts.find((p) => p.version === version) || null;
    }

    // Return active version
    const activeVersion = this.activeVersions.get(id);
    if (activeVersion) {
      return prompts.find((p) => p.version === activeVersion) || null;
    }

    // Fallback to latest version
    return prompts[prompts.length - 1] || null;
  }

  setActiveVersion(promptId: string, version: string): void {
    this.activeVersions.set(promptId, version);
  }

  getActiveVersion(promptId: string): string | null {
    return this.activeVersions.get(promptId) || null;
  }

  getAllVersions(promptId: string): PromptTemplate[] {
    return this.prompts.get(promptId) || [];
  }

  interpolatePrompt(
    template: PromptTemplate,
    variables: Record<string, any>,
  ): string {
    let content = template.content;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, "g"), String(value));
    }

    return content;
  }

  async recordExecution(execution: PromptExecution): Promise<void> {
    // TODO: Store execution data for analytics
    if (this.db) {
      // await this.db.insert(promptExecutions).values(execution);
    }

    // Update performance metrics
    this.updatePerformanceMetrics(execution);
  }

  private updatePerformanceMetrics(execution: PromptExecution): void {
    const prompts = this.prompts.get(execution.promptId);
    if (!prompts) return;

    const prompt = prompts.find((p) => p.version === execution.version);
    if (!prompt) return;

    if (!prompt.performance) {
      prompt.performance = {
        totalUsage: 0,
      };
    }

    prompt.performance.totalUsage++;

    if (execution.qualityScore !== undefined) {
      const currentQuality = prompt.performance.qualityScore || 0;
      const currentCount = prompt.performance.totalUsage - 1;
      prompt.performance.qualityScore =
        (currentQuality * currentCount + execution.qualityScore) /
        prompt.performance.totalUsage;
    }

    // Update success rate
    const successCount = Math.floor(
      (prompt.performance.successRate || 0) *
        (prompt.performance.totalUsage - 1),
    );
    const newSuccessCount = successCount + (execution.success ? 1 : 0);
    prompt.performance.successRate =
      newSuccessCount / prompt.performance.totalUsage;

    // Update average response time
    const currentAvgTime = prompt.performance.avgResponseTime || 0;
    const currentTimeCount = prompt.performance.totalUsage - 1;
    prompt.performance.avgResponseTime =
      (currentAvgTime * currentTimeCount + execution.responseTimeMs) /
      prompt.performance.totalUsage;
  }

  getPerformanceMetrics(promptId: string, version?: string): any {
    const prompt = this.getPrompt(promptId, version);
    return prompt?.performance || null;
  }

  compareVersions(promptId: string, version1: string, version2: string): any {
    const prompt1 = this.getPrompt(promptId, version1);
    const prompt2 = this.getPrompt(promptId, version2);

    if (!prompt1 || !prompt2) {
      throw new Error("One or both prompt versions not found");
    }

    return {
      version1: {
        version: version1,
        performance: prompt1.performance,
      },
      version2: {
        version: version2,
        performance: prompt2.performance,
      },
      comparison: {
        successRateDiff:
          (prompt2.performance?.successRate || 0) -
          (prompt1.performance?.successRate || 0),
        qualityScoreDiff:
          (prompt2.performance?.qualityScore || 0) -
          (prompt1.performance?.qualityScore || 0),
        responseTimeDiff:
          (prompt2.performance?.avgResponseTime || 0) -
          (prompt1.performance?.avgResponseTime || 0),
      },
    };
  }
}

// Singleton instance
export const promptRegistry = new PromptRegistry();
