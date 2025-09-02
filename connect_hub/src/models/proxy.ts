import { Type } from "@sinclair/typebox";
import { Ref, ErrorSchema } from "./shared.js";
export const ProxyEndpointSchema = {
  tags: ["Proxy"],
  description: "Proxies action requests",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    providerId: Type.String(),
    capabilityId: Type.String(),
  }),
  body: Type.Object({
    orgId: Type.String(),
    userId: Type.String(),
    params: Type.Any(),
  }),
  response: {
    200: Type.Any(),
    400: Ref(ErrorSchema),
    401: Ref(ErrorSchema),
    403: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    500: Ref(ErrorSchema),
  },
};
