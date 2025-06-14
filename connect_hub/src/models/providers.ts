import { Static, Type } from "@sinclair/typebox";
export const ProviderEndpoint = Type.Object({
  id: Type.String({ format: "uuid" }),
  name: Type.String(),
  displayName: Type.String(),
  description: Type.String(),
});

export const ProviderSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  name: Type.String(),
  displayName: Type.String(),
  description: Type.String(),
});

export type Provider = Static<typeof ProviderSchema>;

export const ProviderListEndpoint = {
  tags: ["Provider"],
  description: "Get all providers",
  response: {
    200: Type.Array(ProviderSchema),
  },
};
