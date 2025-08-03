import { registry } from "../integrations.js";
import { FastifyTypeBox } from "../types/fastify.js";
import { publishEvents } from "../utils.js";

export async function webhookRoutes(app: FastifyTypeBox) {
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
          for (const trigger of webhook.triggers) {
            if (!trigger.eventSatisfies(request.body)) {
              continue;
            }
            const registrations = await trigger.getTriggerRegistrations(
              request.server.db,
              trigger.id,
              request.body,
            );
            for (const registration of registrations) {
              const events = await trigger.createEvents(
                request.body,
                registration,
              );
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
