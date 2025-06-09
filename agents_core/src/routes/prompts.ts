import { Type } from '@sinclair/typebox';
import type { FastifyTypeBox, FastifyRequestTypeBox, FastifyReplyTypeBox } from '../types/fastify.js';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { promptRegistry, PromptRegistry } from '../prompts/promptRegistry.js';
import { ErrorSchema } from '../schemas/index.js';
import { 
  GetPromptsEndpoint, 
  GetPromptEndpoint, 
  PromptTemplate, 
  PromptTemplateSchema, 
  GetActivePromptEndpoint, 
  SetActivePromptEndpoint,
  ComparePromptVersionsEndpoint,
  ABTestPromptsEndpoint,
  GetPromptMetricsEndpoint,
  PromptVersionComparisonSchema,
  ABTestRequestSchema,
  ABTestResultSchema 
} from '../schemas/prompts.js';

export default async function promptRoutes(fastify: FastifyTypeBox) {
  // Get all prompt templates
  fastify.get('/v1/prompts', {
    schema: GetPromptsEndpoint,
  }, async (
    request: FastifyRequestTypeBox<typeof GetPromptsEndpoint>,
    reply: FastifyReplyTypeBox<typeof GetPromptsEndpoint>
  ) => {
    const allPrompts: PromptTemplate[] = [];
    
    // Get all unique prompt IDs
    const promptIds = ['job-decomposition', 'agent-grouping']; // In real implementation, get from registry
    
    for (const promptId of promptIds) {
      const versions = promptRegistry.getAllVersions(promptId);
      allPrompts.push(...versions);
    }
    
    return reply.status(200).send(allPrompts);
  });

  // Get specific prompt versions
  fastify.get('/v1/prompts/:promptId', {
    schema: GetPromptEndpoint,
  }, async (
    request: FastifyRequestTypeBox<typeof GetPromptEndpoint>,
    reply: FastifyReplyTypeBox<typeof GetPromptEndpoint>
  ) => {
    const { promptId } = request.params;
    
    const versions = promptRegistry.getAllVersions(promptId);
    if (versions.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Prompt with ID '${promptId}' not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }
    
    return versions;
  });

  // Get active version of a prompt
  fastify.get('/v1/prompts/:promptId/active', {
    schema: GetActivePromptEndpoint,
  }, async (
    request: FastifyRequestTypeBox<typeof GetActivePromptEndpoint>,
    reply: FastifyReplyTypeBox<typeof GetActivePromptEndpoint>
  ) => {
    const { promptId } = request.params;
    
    const prompt = promptRegistry.getPrompt(promptId);
    if (!prompt) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Active version of prompt '${promptId}' not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }
    
    return reply.send(prompt);
  });

  // Set active version
  fastify.put('/v1/prompts/:promptId/active/:version', {
    schema: SetActivePromptEndpoint,
  }, async (
    request: FastifyRequestTypeBox<typeof SetActivePromptEndpoint>,
    reply: FastifyReplyTypeBox<typeof SetActivePromptEndpoint>
  ) => {
    const { promptId, version } = request.params;
    
    const prompt = promptRegistry.getPrompt(promptId, version);
    if (!prompt) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Prompt '${promptId}' version '${version}' not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }
    
    promptRegistry.setActiveVersion(promptId, version);
    
    return reply.send({
      message: 'Active version updated successfully',
      promptId,
      activeVersion: version,
    });
  });

  // Compare prompt versions
  fastify.get('/v1/prompts/:promptId/compare/:version1/:version2', {
    schema: ComparePromptVersionsEndpoint,
  }, async (
    request: FastifyRequestTypeBox<typeof ComparePromptVersionsEndpoint>,
    reply: FastifyReplyTypeBox<typeof ComparePromptVersionsEndpoint>
  ) => {
    const { promptId, version1, version2 } = request.params;
    
    try {
      const comparison = promptRegistry.compareVersions(promptId, version1, version2);
      return reply.send(comparison);
    } catch (error) {
      return reply.status(404).send({
        error: 'Not Found',
        message: (error as Error).message,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // A/B test prompt versions
  fastify.post('/v1/prompts/ab-test', {
    schema: ABTestPromptsEndpoint,
  }, async (
    request: FastifyRequestTypeBox<typeof ABTestPromptsEndpoint>,
    reply: FastifyReplyTypeBox<typeof ABTestPromptsEndpoint>
  ) => {
    const { promptId, versions, testInput, iterations = 3 } = request.body;
    
    try {
      // Ensure we have the graph creator available
      if (!fastify.graphCreator) {
        return reply.status(500).send({
          error: 'Service Unavailable',
          message: 'Graph creator service not available',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        });
      }

      const results = [];
      
      for (const version of versions) {
        const versionResult = await fastify.graphCreator.testPromptVersion(
          testInput.jobDescription,
          promptId,
          version,
          iterations
        );
        results.push(versionResult);
      }

      // Determine best version based on metrics
      let bestVersion = versions[0] || '';
      let bestScore = 0;
      let confidence = 0;

      for (const result of results) {
        const metrics = result.metrics;
        if (metrics) {
          // Simple scoring: weight success rate and quality score
          const score = (metrics.successRate || 0) * 0.6 + (metrics.qualityScore || 0) * 0.04;
          if (score > bestScore) {
            bestScore = score;
            bestVersion = result.version;
            confidence = Math.min(0.95, score * 0.8); // Simple confidence calculation
          }
        }
      }

      const recommendation = {
        bestVersion,
        reason: `Version ${bestVersion} achieved the highest combined score based on success rate and quality`,
        confidence,
      };

      return reply.send({
        promptId,
        versions,
        results,
        recommendation,
      });
    } catch (error) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: (error as Error).message,
        statusCode: 400,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get prompt performance metrics
  fastify.get('/v1/prompts/:promptId/metrics', {
    schema: GetPromptMetricsEndpoint,
  }, async (
    request: FastifyRequestTypeBox<typeof GetPromptMetricsEndpoint>,
    reply: FastifyReplyTypeBox<typeof GetPromptMetricsEndpoint>
  ) => {
    const { promptId } = request.params;
    
    const versions = promptRegistry.getAllVersions(promptId);
    if (versions.length === 0) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Prompt with ID '${promptId}' not found`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
      });
    }

    const metricsData = versions.map(prompt => ({
      version: prompt.version,
      metrics: prompt.performance || null,
    }));

    return reply.send(metricsData);
  });
} 