import type { MultiAgentSpec, TaskDecomposition } from './types/index.js';

export class MultiAgentGraphCreator {
  constructor(
    private connectIqUrl: string,
    private openaiApiKey: string
  ) {}

  async createMultiAgentSystem(
    jobDescription: string, 
    orgId: string,
    name?: string
  ): Promise<MultiAgentSpec> {
    // TODO: Implement multi-agent system creation
    throw new Error('Not implemented');
  }

  async decomposeJobDescription(jobDescription: string): Promise<TaskDecomposition[]> {
    // TODO: Implement job description decomposition using LLM
    throw new Error('Not implemented');
  }
} 