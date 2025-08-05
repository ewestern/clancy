import { Static, Type } from "@sinclair/typebox";
import { Ref, StringEnum } from "./shared.js";

export enum ProviderKind {
  Internal = "internal",
  External = "external",
}

export const ProviderKindSchema = StringEnum(
  [ProviderKind.Internal, ProviderKind.External],
  {
    $id: "ProviderKind",
  },
);

export enum ProviderAuth {
  None = "none",
  OAuth2 = "oauth2",
  APIKey = "api_key",
  Basic = "basic",
}
export const ProviderAuthSchema = StringEnum(
  [
    ProviderAuth.None,
    ProviderAuth.OAuth2,
    ProviderAuth.APIKey,
    ProviderAuth.Basic,
  ],
  {
    $id: "ProviderAuth",
  },
);

export const ProviderMetadataSchema = Type.Object(
  {
    id: Type.String({ format: "uuid" }),
    displayName: Type.String(),
    description: Type.String(),
    icon: Type.String(),
    docsUrl: Type.Optional(Type.String({ format: "uri" })),
    kind: Ref(ProviderKindSchema),
    auth: Ref(ProviderAuthSchema),
  },
  { $id: "Provider" },
);

export const ProviderListEndpoint = {
  tags: ["Providers"],
  description: "Get all providers",
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Array(Ref(ProviderMetadataSchema)),
  },
};

export type ProviderMetadata = Static<typeof ProviderMetadataSchema>;
