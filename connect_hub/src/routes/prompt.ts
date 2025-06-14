import {
  FastifyTypeBox,
  FastifyReplyTypeBox,
  FastifyRequestTypeBox,
} from "../types/fastify.d.js";
import { registry } from "../integrations.js";
import { PromptEndpointSchema } from "../models/prompts.js";

export async function promptRoutes(app: FastifyTypeBox) {
  app.get(
    "/prompt/:provider/:capability/:version",
    {
      schema: PromptEndpointSchema,
    },
    async (
      request: FastifyRequestTypeBox<typeof PromptEndpointSchema>,
      reply: FastifyReplyTypeBox<typeof PromptEndpointSchema>,
    ) => {
      const { provider, capability, version } = request.params;

      try {
        const prov = registry.getProvider(provider);
        const cap = prov.getCapability<any, any>(capability);
        const spec = cap.meta.promptVersions.find((p) => p.version === version);

        if (!spec) {
          return reply
            .status(404)
            .send({ message: "Prompt version not found" });
        }
        return reply.status(200).send(spec);
      } catch (err) {
        app.log.warn({ err }, "Prompt lookup failed");
        return reply
          .status(404)
          .send({ message: "Provider or capability not found" });
      }
    },
  );
}
