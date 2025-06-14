import {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.d.js";
import { CapabilitiesEndpointSchema } from "../models/capabilities.js";
import { registry } from "../integrations.js";

export async function capabilitiesRoutes(app: FastifyTypeBox) {
  app.get(
    "/capabilities",
    {
      schema: CapabilitiesEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof CapabilitiesEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof CapabilitiesEndpointSchema>,
    ) => {
      const capabilities = registry.getCapabilities();

      return reply.status(200).send(capabilities);
    },
  );
}
