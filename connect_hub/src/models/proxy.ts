import { Type } from "@sinclair/typebox";

export const ProxyEndpointSchema = {
  tags: ["Proxy"],
  description: "Proxies action requests",
  params: Type.Object({
    providerId: Type.String(),
    capabilityId: Type.String(),
  }),
  querystring: Type.Object({
    orgId: Type.String(),
  }),
  body: Type.Any(),
  response: {
    200: Type.Any(),
    400: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
  },
};
