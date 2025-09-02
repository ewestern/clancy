import { getAuth } from "@clerk/fastify";
import { FastifyRequest } from "fastify";

export function getUnifiedAuth(request: FastifyRequest) {
  const auth = getAuth(request);
  let { orgId, userId } = auth;
  if (!orgId) {
    orgId = (auth.sessionClaims?.o as unknown as { id: string }).id;
  }
  if (!userId) {
    userId = auth.sessionClaims?.sub as string;
  }
  return { orgId, userId };
}
