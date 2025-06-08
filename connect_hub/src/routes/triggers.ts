import { FastifyTypeBox } from "../types/fastify.js";
import { CreateTriggerRegistrationEndpoint } from "../models/triggers.js";
import { triggerRegistrations } from "../database/schema.js";

export async function triggerRoutes(app: FastifyTypeBox) {
    app.post("/triggers", {
        schema: CreateTriggerRegistrationEndpoint,
        handler: async (request, reply) => {
            ///const triggerRegistration = request.body;
            const toInsert = {
                ...request.body,
                expiresAt: new Date(request.body.expiresAt),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const [triggerRegistration] = await app.db.insert(triggerRegistrations).values(toInsert).returning();
            reply.status(201).send({
                id: triggerRegistration.id,
                agentId: triggerRegistration.agentId,
                triggerId: triggerRegistration.triggerId,
                connectionId: triggerRegistration.connectionId!, // TODO: fix this
                metadata: triggerRegistration.metadata,
                expiresAt: triggerRegistration.expiresAt.toISOString(),
                createdAt: triggerRegistration.createdAt.toISOString(),
            });
        },
    });
}