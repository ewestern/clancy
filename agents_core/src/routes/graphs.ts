import { FastifyInstance } from 'fastify';
import { 
  CreateGraphEndpoint,
  GetGraphEndpoint,
  ListGraphsEndpoint,
} from '../schemas/graph.js';
import type { FastifyRequestTypeBox, FastifyReplyTypeBox, FastifyTypeBox } from '../types/fastify.js';
import { v4 as generateUuid } from 'uuid';

export async function graphRoutes(fastify: FastifyTypeBox) {
  // Create multi-agent system
  fastify.post('/organizations/:orgId/graphs',
    {schema: CreateGraphEndpoint},
    async (
      request: FastifyRequestTypeBox<typeof CreateGraphEndpoint>,
      reply: FastifyReplyTypeBox<typeof CreateGraphEndpoint>
    ) => {
      try {
        const { orgId } = request.params;
        const { name, jobDescription, metadata } = request.body;

        // Generate multi-agent system specification
        const specification = await fastify.graphCreator.createMultiAgentSystem(
          jobDescription,
          orgId,
          name
        );

        // Save to database
        const systemId = generateUuid();
        
        // TODO: Save to database using Drizzle
        // const [savedSystem] = await fastify.db
        //   .insert(multiAgentSystems)
        //   .values({
        //     systemId,
        //     organizationId: orgId,
        //     name,
        //     jobDescription,
        //     specification,
        //     status: 'active',
        //     ...(metadata && { metadata })
        //   })
        //   .returning();

        // Register individual agents in the agent registry
        for (const agent of specification.agents) {
          await fastify.agentRegistry.createAgent(orgId, {
            agentId: agent.id,
            organizationId: orgId,
            role: agent.name,
            capabilities: agent.specification?.capabilities || [],
            metadata: {
              ...agent.specification,
              systemId,
              graphSpec: agent,
            },
          });
        }

        // Log the creation
        await fastify.auditService.logEvent({
          type: 'multi_agent_system_created',
          resource: 'multi_agent_system',
          action: 'create',
          metadata: {
            systemId,
            orgId,
            name,
            agentCount: specification.agents.length,
          },
        });

        return reply.status(201).send({
          systemId,
          specification,
        });
      } catch (error) {
        request.log.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          orgId: request.params.orgId,
          jobDescription: request.body.jobDescription,
        }, 'Failed to create multi-agent system');

        if (error instanceof Error && error.message.includes('Invalid job description')) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: error.message,
            statusCode: 400,
            timestamp: new Date().toISOString(),
            path: request.url,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create multi-agent system',
          statusCode: 500,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    },
  );

  // Get multi-agent system by ID
  fastify.get('/organizations/:orgId/graphs/:systemId', 
    {schema: GetGraphEndpoint},
    async (
      request: FastifyRequestTypeBox<typeof GetGraphEndpoint>,
      reply: FastifyReplyTypeBox<typeof GetGraphEndpoint>
    ) => {
      try {
        const { orgId, systemId } = request.params;

        // TODO: Fetch from database
        // const system = await fastify.db
        //   .select()
        //   .from(multiAgentSystems)
        //   .where(and(
        //     eq(multiAgentSystems.systemId, systemId),
        //     eq(multiAgentSystems.organizationId, orgId)
        //   ))
        //   .limit(1);

        // if (system.length === 0) {
        //   return reply.status(404).send({
        //     error: 'Not Found',
        //     message: 'Multi-agent system not found',
        //     statusCode: 404,
        //     timestamp: new Date().toISOString(),
        //     path: request.url,
        //   });
        // }

        // For now, return a placeholder response
        return reply.status(200).send({
          systemId,
          name: 'Example System',
          jobDescription: 'Example job description',
          specification: {
            version: '0.1.0',
            jobDescription: 'Example job description',
            agents: [],
            interAgentMessages: [],
            executionMode: 'event-driven',
          },
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          systemId: request.params.systemId,
          orgId: request.params.orgId,
        }, 'Failed to fetch multi-agent system');

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch multi-agent system',
          statusCode: 500,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  );

  // List multi-agent systems for organization
  fastify.get('/organizations/:orgId/graphs', 
    {schema: ListGraphsEndpoint},
    async (
      request: FastifyRequestTypeBox<typeof ListGraphsEndpoint>,
      reply: FastifyReplyTypeBox<typeof ListGraphsEndpoint>
    ) => {
      try {
        const { orgId } = request.params;
        const { limit = 20, offset = 0, status } = request.query;

        // TODO: Fetch from database with pagination and filtering
        // const systems = await fastify.db
        //   .select({
        //     systemId: multiAgentSystems.systemId,
        //     name: multiAgentSystems.name,
        //     jobDescription: multiAgentSystems.jobDescription,
        //     status: multiAgentSystems.status,
        //     createdAt: multiAgentSystems.createdAt,
        //     specification: multiAgentSystems.specification,
        //   })
        //   .from(multiAgentSystems)
        //   .where(
        //     and(
        //       eq(multiAgentSystems.organizationId, orgId),
        //       status ? eq(multiAgentSystems.status, status) : undefined
        //     )
        //   )
        //   .limit(limit)
        //   .offset(offset)
        //   .orderBy(desc(multiAgentSystems.createdAt));

        // For now, return empty results
        return reply.status(200).send({
          systems: [],
          total: 0,
          limit,
          offset,
        });
      } catch (error) {
        request.log.error({
          error: error instanceof Error ? error.message : 'Unknown error',
          orgId: request.params.orgId,
        }, 'Failed to list multi-agent systems');

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to list multi-agent systems',
          statusCode: 500,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
      }
    }
  );

}; 