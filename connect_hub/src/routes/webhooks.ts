import { registry } from "../integrations.js";
import { FastifyTypeBox } from "../types/fastify.js";
import { ProviderKind } from "../models/capabilities.js";
import { KinesisClient, PutRecordCommand, PutRecordsCommand } from "@aws-sdk/client-kinesis";

async function publishEvents(events: {event: Record<string, unknown>, partitionKey: string}[]) {
  const kinesisClient = new KinesisClient({
    region: process.env.AWS_REGION,
    profile: process.env.AWS_PROFILE,
  });
  const command = new PutRecordsCommand({
    Records: events.map(e => ({
      Data: Buffer.from(JSON.stringify(e.event)),
      PartitionKey: e.partitionKey,
    })),
    StreamName: process.env.KINESIS_STREAM_NAME,
  })
  await kinesisClient.send(command);
}

export async function webhookRoutes(app: FastifyTypeBox) {
    registry.getProviders()
        .filter(p => p?.metadata.kind === ProviderKind.External)
        .forEach(provider => {
            provider?.webhooks?.forEach(webhook => {
                app.post(`/webhooks/${provider.metadata.id}`, {
                    schema: webhook.eventSchema,
                    config: {
                        rawBody: true,
                    },
                }, async (request, reply) => {
                    if (!await webhook.validateRequest(request)) {
                        reply.status(401).send({
                            status: "unauthorized",
                        });
                        return;
                    }
                    for (const trigger of webhook.triggers) {
                      if (!trigger.eventSatisfies(request.body)) {
                        continue;
                      }
                      const registrations = await trigger.getTriggerRegistrations(request.server.db, trigger.id, request.body);
                      for (const registration of registrations) {
                          const events = await trigger.createEvents(request.body, registration);
                          await publishEvents(events);
                      }
                    }
                });
            });
        });
}