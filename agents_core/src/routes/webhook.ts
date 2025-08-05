import { FastifyPluginAsync } from "fastify";
import { WebhookEndpoint } from "../models/webhook.js";
import { FastifyRequestTypeBox } from "../types/fastify.js";
import {
  EventType,
  Event,
  RequestHumanFeedbackEvent,
  ProviderConnectionCompletedEvent,
  EmployeeStateUpdateEvent,
} from "@ewestern/events";

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/webhook",
    {
      schema: WebhookEndpoint,
    },
    async (request: FastifyRequestTypeBox<typeof WebhookEndpoint>, reply) => {
      const payload = request.body as Event;
      console.log("Received webhook event:", payload);

      request.log.info(`Received webhook event: ${payload.type}`);

      switch (payload.type) {
        case EventType.EmployeeStateUpdate:
          handleEmployeeStateUpdate(
            payload as EmployeeStateUpdateEvent,
            request,
          );
          break;

        case EventType.RequestHumanFeedback:
          handleRequestHumanFeedback(
            payload as RequestHumanFeedbackEvent,
            request,
          );
          break;

        case EventType.ProviderConnectionCompleted:
          handleProviderConnectionCompleted(
            payload as ProviderConnectionCompletedEvent,
            request,
          );
          break;

        default:
          request.log.warn(`Unhandled event type: ${payload.type}`);
          return reply
            .status(400)
            .send({ message: `Unhandled event type: ${payload.type}` });
      }

      return reply.status(200).send({ message: "ok" });
    },
  );
};

/**
 * Handle AiEmployeeUpdateEvent - send to all users in the organization
 */
function handleEmployeeStateUpdate(
  event: EmployeeStateUpdateEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const sentCount = request.server.wsService.sendEventToOrg(event.orgId, event);
  request.log.info(
    `Sent AiEmployeeUpdate to ${sentCount} connections in org ${event.orgId}`,
  );
}

/**
 * Handle RequestHumanFeedbackEvent - send to specific user
 */
function handleRequestHumanFeedback(
  event: RequestHumanFeedbackEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const sent = request.server.wsService.sendEvent(event.userId, event);
  if (sent) {
    request.log.info(`Sent RequestHumanFeedback to user ${event.userId}`);
  } else {
    request.log.warn(
      `User ${event.userId} not connected for RequestHumanFeedback`,
    );
  }
}

/**
 * Handle ProviderConnectionCompletedEvent - send to all users in the organization
 */
function handleProviderConnectionCompleted(
  event: ProviderConnectionCompletedEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const sentCount = request.server.wsService.sendEvent(event.userId, event);
  request.log.info(
    `Sent ProviderConnectionCompleted to ${sentCount} connections in org ${event.orgId}`,
  );
}
