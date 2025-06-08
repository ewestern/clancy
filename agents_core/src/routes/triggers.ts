import { FastifyPluginAsync } from "fastify";
import { TriggerSchema, ErrorSchema } from "../models/shared";
import { Type } from "@sinclair/typebox";
import { TriggerEndpoint } from "../models/trigger";

export const triggerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/triggers", {
    schema: TriggerEndpoint,
    handler: async (request, reply) => {
      try {
        const { organizationId, triggerType, payload } = request.body as any;
        
        // Process the trigger (existing business logic)
        fastify.log.info('Processing trigger:', { organizationId, triggerType });
        
        // Example: Notify WebSocket clients about trigger processing
        if (fastify.wsManager) {
          // Notify organization channel
          fastify.wsManager.broadcastToChannel(`org:${organizationId}`, {
            type: 'TRIGGER_PROCESSING_STARTED',
            data: {
              triggerType,
              status: 'processing',
              triggeredAt: new Date().toISOString()
            }
          });

          // Use event bus for cross-service messaging
          const eventBus = fastify.wsManager.getEventBus();
          await eventBus.publish('broadcast_to_channel', {
            type: 'TRIGGER_UPDATE',
            channel: `trigger:${triggerType}`,
            data: {
              organizationId,
              payload,
              status: 'initiated'
            },
            timestamp: new Date().toISOString()
          });
        }
        
        // Simulate processing result
        const result = {
          id: `trigger_${Date.now()}`,
          status: 'completed',
          processedAt: new Date().toISOString()
        };
        
        // Notify completion via WebSocket
        if (fastify.wsManager) {
          fastify.wsManager.broadcastToChannel(`org:${organizationId}`, {
            type: 'TRIGGER_PROCESSING_COMPLETED',
            data: result
          });
        }
        
        return reply.send(result);
        
      } catch (error) {
        fastify.log.error('Trigger processing failed:', error);
        
        // Notify error via WebSocket
        if (fastify.wsManager && request.body) {
          const { organizationId } = request.body as any;
          fastify.wsManager.broadcastToChannel(`org:${organizationId}`, {
            type: 'TRIGGER_PROCESSING_FAILED',
            data: {
              error: error instanceof Error ? error.message : 'Unknown error',
              failedAt: new Date().toISOString()
            }
          });
        }
        
        throw error;
      }
    },
  });

  // Example endpoint to broadcast custom messages
  fastify.post("/broadcast", {
    schema: {
      body: Type.Object({
        channel: Type.String(),
        type: Type.String(),
        data: Type.Any(),
        organizationId: Type.Optional(Type.String()),
        userId: Type.Optional(Type.String())
      }),
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          clientsReached: Type.Number(),
          timestamp: Type.String()
        })
      }
    },
         handler: async (request, reply) => {
       const { channel, type, data, organizationId, userId } = request.body as {
         channel: string;
         type: string;
         data: any;
         organizationId?: string;
         userId?: string;
       };
      
      if (!fastify.wsManager) {
        return reply.code(503).send({ error: 'WebSocket manager not available' });
      }
      
      let clientsReached = 0;
      
      if (channel) {
        // Broadcast to specific channel
        clientsReached = fastify.wsManager.broadcastToChannel(channel, { type, data });
      } else if (organizationId) {
        // Broadcast to organization
        clientsReached = fastify.wsManager.broadcastToFiltered(
          { organizationId },
          { type, channel: `org:${organizationId}`, data }
        );
      } else if (userId) {
        // Broadcast to specific user
        clientsReached = fastify.wsManager.broadcastToFiltered(
          { userId },
          { type, channel: `user:${userId}`, data }
        );
      }
      
      return reply.send({
        success: true,
        clientsReached,
        timestamp: new Date().toISOString()
      });
    }
  });
};
