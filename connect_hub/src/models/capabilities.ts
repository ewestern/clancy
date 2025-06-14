import { Static, Type } from "@sinclair/typebox";

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
  promptVersions: Type.Array(
    Type.Object({
      version: Type.String({
        description: "Prompt version tag (semver or date)",
      }),
      modelHint: Type.Optional(Type.String()),
      system: Type.String(),
      user: Type.Optional(Type.String()),
      fewShot: Type.Optional(
        Type.Array(
          Type.Object({
            user: Type.String(),
            assistant: Type.String(),
          }),
        ),
      ),
    }),
  ),
});

export const ProviderCapabilitiesSchema = Type.Object({
  id: Type.String({ description: "Provider slug, e.g. slack" }),
  displayName: Type.String(),
  description: Type.String(),
  icon: Type.String(),
  docsUrl: Type.Optional(Type.String({ format: "uri" })),
  kind: Type.Union([Type.Literal("internal"), Type.Literal("external")]),
  auth: Type.Union([
    Type.Literal("none"),
    Type.Literal("oauth2"),
    Type.Literal("api_key"),
    Type.Literal("basic"),
  ]),
  requiredScopes: Type.Array(Type.String()),
  capabilities: Type.Array(CapabilitySchema),
});

export type CapabilityMeta = Static<typeof CapabilitySchema>;
export type ProviderCapabilities = Static<typeof ProviderCapabilitiesSchema>;

export const CapabilitiesEndpointSchema = {
  tags: ["Capabilities"],
  description:
    "Returns the catalog of provider capabilities available to the platform.",
  response: {
    200: Type.Array(ProviderCapabilitiesSchema),
  },
} as const;

export type CapabilitiesEndpoint = typeof CapabilitiesEndpointSchema;
