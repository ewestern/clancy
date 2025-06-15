import {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.d.js";
import { CapabilitiesEndpointSchema, CapabilitySchema, ProviderAuthSchema, ProviderCapabilitiesSchema, ProviderKindSchema } from "../models/capabilities.js";
import { registry } from "../integrations.js";
import { PromptSpecSchema } from "../models/prompts.js";

export async function capabilitiesRoutes(app: FastifyTypeBox) {
  app.addSchema(ProviderCapabilitiesSchema);
  app.addSchema(ProviderKindSchema);
  app.addSchema(ProviderAuthSchema);
  app.addSchema(CapabilitySchema);
  app.addSchema(PromptSpecSchema);
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
