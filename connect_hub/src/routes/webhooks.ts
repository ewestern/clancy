import { registry } from "../integrations.js";
import { FastifyInstance } from "fastify";
import { publishEvents } from "../utils.js";

export async function webhookRoutes(app: FastifyInstance) {
  registry.getProviders().forEach((provider) => {
    provider?.webhooks?.forEach((webhook) => {
      app.post(
        `/webhooks/${provider.metadata.id}`,
        {
          schema: webhook.eventSchema,
          config: {
            rawBody: true,
          },
        },
        async (request, reply) => {
          if (!(await webhook.validateRequest(request))) {
            reply.status(401).send({
              status: "unauthorized",
            });
            return;
          }
          const event = request.body;

          for (const trigger of webhook.triggers) {
            if (!trigger.eventSatisfies(event)) {
              continue;
            }
            const registrations = await trigger.getTriggerRegistrations(
              request.server.db,
              trigger.id,
              event,
            );
            for (const registration of registrations) {
              const events = await trigger.createEvents(event, registration);
              await publishEvents(events);
            }
          }
          if (webhook.replyHook) {
            await webhook.replyHook(request, reply);
            return;
          } else {
            return reply.status(200).send({
              status: "ok",
            });
          }
        },
      );
    });
  });
}
