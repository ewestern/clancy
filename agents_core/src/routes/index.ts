import { FastifyTypeBox } from "../types/fastify.js";
import { healthRoutes } from "./health";
import { agentRoutes } from "./agents";
import { approvalRoutes } from "./approvals";
import { triggerRoutes } from "./triggers";
import { wsRoutes } from "./ws";


export async function registerRoutes(app: FastifyTypeBox) {
  console.log("registering routes");
  await app.register(healthRoutes, { prefix: "" });
  await app.register(triggerRoutes, { prefix: "/v1" });
  await app.register(agentRoutes, { prefix: "/v1" });
  await app.register(approvalRoutes, { prefix: "/v1" });
  await app.register(wsRoutes, { prefix: "/ws" });
}