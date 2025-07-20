import { isModuleNamespaceObject } from "util/types";
import {
  FastifyTypeBox,
  FastifyRequestTypeBox,
  FastifyReplyTypeBox,
} from "../types/fastify.d.js";
import { registry } from "../integrations.js";
import {
  ProviderAuthSchema,
  ProviderKindSchema,
  ProviderListEndpoint,
  ProviderMetadataSchema,
} from "../models/providers.js";

export async function providersRoutes(app: FastifyTypeBox) {
  app.addSchema(ProviderMetadataSchema);
  app.addSchema(ProviderKindSchema);
  app.addSchema(ProviderAuthSchema);

  app.get(
    "/providers",
    {
      schema: ProviderListEndpoint,
    },
    async (
      req: FastifyRequestTypeBox<typeof ProviderListEndpoint>,
      res: FastifyReplyTypeBox<typeof ProviderListEndpoint>,
    ) => {
      const providers = registry
        .getProviders()
        .map((provider) => provider.metadata);
      return res.send(providers);
    },
  );
}
