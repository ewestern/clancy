import { FastifyPluginAsync } from "fastify";
import { WebhookEndpoint } from "../models/webhook.js";
import { FastifyRequestTypeBox } from "../types/fastify.js";
import {
  EventType,
  Event,
  RequestHumanFeedbackEvent,
  ProviderConnectionCompletedEvent,
  EmployeeStateUpdateEvent,
  RunCompletedEvent,
  RunIntentEvent,
  ActionInitiatedEvent,
  ActionCompletedEvent,
  RequestApprovalEvent,
} from "@ewestern/events";
import { agentRunActions, agentRuns } from "../database/schema.js";
import { AgentActionStatus, AgentRunStatus } from "../models/runs.js";
import { and, eq } from "drizzle-orm";

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    "/webhook",
    {
      schema: WebhookEndpoint,
    },
    async (request: FastifyRequestTypeBox<typeof WebhookEndpoint>, reply) => {
      const payload = request.body as Event;

      request.log.info(`Received webhook event: ${payload.type}`);

      switch (payload.type) {
        case EventType.RunIntent:
          await handleRunIntent(payload as RunIntentEvent, request);
          break;
        case EventType.RequestApproval:
          await handleRequestApproval(payload as RequestApprovalEvent, request);
          break;
        case EventType.ActionInitiated:
          await handleActionInitiated(payload as ActionInitiatedEvent, request);
          break;
        case EventType.ActionCompleted:
          await handleActionCompleted(payload as ActionCompletedEvent, request);
          break;

        case EventType.RunCompleted:
          await handleRunCompleted(payload as RunCompletedEvent, request);
          break;

        case EventType.EmployeeStateUpdate:
          await handleEmployeeStateUpdate(
            payload as EmployeeStateUpdateEvent,
            request,
          );
          break;

        case EventType.RequestHumanFeedback:
          await handleRequestHumanFeedback(
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

async function handleRequestApproval(
  event: RequestApprovalEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const [run] = await request.server.db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.executionId, event.executionId));
  if (!run) {
    request.log.warn(
      `Run not found for request approval event: ${event.executionId}`,
    );
    return;
  }
  await request.server.db
    .update(agentRunActions)
    .set({
      formattedRequest: event.request,
    })
    .where(
      and(
        eq(agentRunActions.agentRunId, run.id),
        eq(agentRunActions.capabilityId, event.capability.id),
        eq(agentRunActions.providerId, event.capability.providerId),
      ),
    );
  request.log.info(`Received RequestApproval event: ${event.executionId}`);
}

async function handleActionInitiated(
  event: ActionInitiatedEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const [run] = await request.server.db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.executionId, event.executionId));
  if (!run) {
    request.log.warn(
      `Run not found for action initiated event: ${event.executionId}`,
    );
    return;
  }
  await request.server.db.insert(agentRunActions).values({
    agentRunId: run.id,
    capabilityId: event.capability.id,
    providerId: event.capability.providerId,
    status: AgentActionStatus.Running,
    result: {},
    createdAt: new Date(),
  });
}

async function handleActionCompleted(
  event: ActionCompletedEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const [run] = await request.server.db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.executionId, event.executionId));
  if (!run) {
    request.log.warn(
      `Run not found for action completed event: ${event.executionId}`,
    );
    return;
  }
  await request.server.db
    .update(agentRunActions)
    .set({
      status:
        event.status === "success"
          ? AgentActionStatus.Success
          : AgentActionStatus.Error,
      result: event.result,
    })
    .where(
      and(
        eq(agentRunActions.agentRunId, run.id),
        eq(agentRunActions.capabilityId, event.capability.id),
        eq(agentRunActions.providerId, event.capability.providerId),
      ),
    );
}

async function handleRunIntent(
  event: RunIntentEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  await request.server.db.insert(agentRuns).values({
    agentId: event.agentId,
    executionId: event.executionId,
    status: AgentRunStatus.Running,
    runStartedAt: new Date(),
  });
  request.log.info(`Received RunIntent event: ${event.executionId}`);
}

async function handleRunCompleted(
  event: RunCompletedEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  await request.server.db
    .update(agentRuns)
    .set({
      status: AgentRunStatus.Completed,
      runCompletedAt: new Date(),
    })
    .where(eq(agentRuns.executionId, event.executionId));
  request.log.info(`Received RunCompleted event: ${event.executionId}`);
}

/**
 * Handle AiEmployeeUpdateEvent - send to all users in the organization
 */
async function handleEmployeeStateUpdate(
  event: EmployeeStateUpdateEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const sentCount = request.server.wsService.sendEventToOrg(event.orgId, event);
  request.log.info(
    `Sent EmployeeStateUpdate to ${sentCount} connections in org ${event.orgId}`,
  );
}

/**
 * Handle RequestHumanFeedbackEvent - send to specific user
 */
async function handleRequestHumanFeedback(
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
async function handleProviderConnectionCompleted(
  event: ProviderConnectionCompletedEvent,
  request: FastifyRequestTypeBox<typeof WebhookEndpoint>,
) {
  const sentCount = request.server.wsService.sendEvent(event.userId, event);
  request.log.info(
    `Sent ProviderConnectionCompleted to ${sentCount} connections in org ${event.orgId}`,
  );
}
