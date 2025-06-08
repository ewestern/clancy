import { PromptTemplate } from "../models/prompts.js";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

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
    try {
      const __dirname = import.meta.dirname;
      const promptsDir = __dirname;
      const yamlFiles = fs
        .readdirSync(promptsDir)
        .filter((file) => file.endsWith(".yaml"));

      for (const file of yamlFiles) {
        const filePath = path.join(promptsDir, file);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const promptData = yaml.parse(fileContent);

        // Validate and register the prompt
        if (this.isValidPromptData(promptData)) {
          this.registerPrompt(promptData);
        } else {
          console.warn(`Skipping invalid prompt file: ${file}`);
        }
      }

      // Set default active versions (you may want to make this configurable)
      this.setActiveVersion("job-decomposition", "v1.0.0");
      this.setActiveVersion("agent-grouping", "v1.0.0");
    } catch (error) {
      console.error("Error loading prompts from YAML files:", error);
      // Fallback to empty registry or throw error based on your requirements
    }
  }

  private isValidPromptData(data: any): data is PromptTemplate {
    return (
      typeof data.id === "string" &&
      typeof data.name === "string" &&
      typeof data.version === "string" &&
      typeof data.content === "string" &&
      Array.isArray(data.variables) &&
      typeof data.metadata === "object" &&
      typeof data.metadata.description === "string" &&
      typeof data.metadata.author === "string" &&
      typeof data.metadata.createdAt === "string"
    );
  }

  registerPrompt(prompt: PromptTemplate): void {
    // Validate the prompt against the schema
    try {
      const isValid = this.isValidPromptData(prompt);
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
