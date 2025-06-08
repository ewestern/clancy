import { Static, Type } from "@sinclair/typebox";
import { Ref } from "./shared.js";

export const ProviderSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    name: Type.String(),
    displayName: Type.String(),
    description: Type.String(),
  },
  { $id: "Provider" },
);

export type Provider = Static<typeof ProviderSchema>;

export const ProviderListEndpoint = {
  tags: ["Provider"],
  description: "Get all providers",
  response: {
    200: Type.Array(Ref(ProviderSchema)),
  },
};
