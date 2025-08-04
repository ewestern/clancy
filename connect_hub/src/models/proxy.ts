import { Type } from "@sinclair/typebox";
import { Ref } from "./shared.js";
import { OwnershipScopeSchema } from "./capabilities.js";

export const ProxyEndpointSchema = {
  tags: ["Proxy"],
  description: "Proxies action requests",
  params: Type.Object({
    providerId: Type.String(),
    capabilityId: Type.String(),
  }),
  body: Type.Object({
    userId: Type.String(),
    orgId: Type.String(),
    params: Type.Any(),
  }),
  response: {
    200: Type.Any(),
    400: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
  },
};
