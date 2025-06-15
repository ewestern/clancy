import { Static, Type } from "@sinclair/typebox";
import { Ref, StringEnum } from "./shared.js";
import { PromptSpecSchema } from "./prompts.js";

// ------------------------------------------------------------
// Capability contracts (TypeBox)
// ------------------------------------------------------------

export const JSONSchema = Type.Unknown(); // Placeholder to allow arbitrary JSON schema objects

export const CapabilitySchema = Type.Object({
  id: Type.String({ description: "Capability identifier, e.g. chat.post" }),
  displayName: Type.String(),
  description: Type.String(),
  paramsSchema: JSONSchema,
  resultSchema: JSONSchema,
  requiredScopes: Type.Array(Type.String()),
  promptVersions: Type.Optional(Type.Array(Ref(PromptSpecSchema))),
}, {$id: "Capability"});

export enum ProviderKind {
  Internal = "internal",
  External = "external",
}

export const ProviderKindSchema = StringEnum([ProviderKind.Internal, ProviderKind.External], {
  $id: "ProviderKind",
});

export enum ProviderAuth {
  None = "none",
  OAuth2 = "oauth2",
  APIKey = "api_key",
  Basic = "basic",
}
export const ProviderAuthSchema = StringEnum([ProviderAuth.None, ProviderAuth.OAuth2, ProviderAuth.APIKey, ProviderAuth.Basic], {
  $id: "ProviderAuth",
});

export const ProviderCapabilitiesSchema = Type.Object({
  id: Type.String({ description: "Provider slug, e.g. slack" }),
  displayName: Type.String(),
  description: Type.String(),
  icon: Type.String(),
  docsUrl: Type.Optional(Type.String({ format: "uri" })),
  kind: Ref(ProviderKindSchema),
  auth: Ref(ProviderAuthSchema),
  capabilities: Type.Array(Ref(CapabilitySchema)),
}, {$id: "ProviderCapabilities"});

export type CapabilityMeta = Static<typeof CapabilitySchema>;
export type ProviderCapabilities = Static<typeof ProviderCapabilitiesSchema>;

export const CapabilitiesEndpointSchema = {
  tags: ["Capabilities"],
  description:
    "Returns the catalog of provider capabilities available to the platform.",
  response: {
    200: Type.Array(Ref(ProviderCapabilitiesSchema)),
  },
} as const;

export type CapabilitiesEndpoint = typeof CapabilitiesEndpointSchema;
