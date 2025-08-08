import { Type } from "@sinclair/typebox";

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
    400: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
  },
};
