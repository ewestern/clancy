import { FastifyInstance } from "fastify";
import { registry } from "../integrations.js";

export async function registerHooks(app: FastifyInstance) {
  const providers = registry.getProviders();
  providers.forEach(async (provider) => {
    //if (provider.registerWebhook) {
    //  await provider.registerWebhook(app);
    //}
  });
}
