import { Static, Type } from "@sinclair/typebox";
import { Ref, StringEnum } from "./shared.js";
import { CapabilityRisk } from "../providers/types.js";
import { OwnershipScope } from "./shared.js";
import { ProviderKindSchema, ProviderAuthSchema } from "./providers.js";

// ------------------------------------------------------------
// Capability contracts (TypeBox)
// ------------------------------------------------------------

export const JSONSchema = Type.Unknown();

export const CapabilityRiskSchema = StringEnum(
  [CapabilityRisk.LOW, CapabilityRisk.MEDIUM, CapabilityRisk.HIGH],
  {
    $id: "CapabilityRisk",
  },
);
export const OwnershipScopeSchema = Type.Enum(OwnershipScope, {
  $id: "OwnershipScope",
});

export const CapabilitySummarySchema = Type.Object(
  {
    id: Type.String({ description: "Capability identifier, e.g. chat.post" }),
    displayName: Type.String(),
    description: Type.String(),
    ownershipScope: Ref(OwnershipScopeSchema),
    risk: Ref(CapabilityRiskSchema),
  },
  { $id: "CapabilitySummary" },
);

export const CapabilitySchema = Type.Object(
  {
    id: Type.String({ description: "Capability identifier, e.g. chat.post" }),
    displayName: Type.String(),
    description: Type.String({}),
    paramsSchema: JSONSchema,
    resultSchema: JSONSchema,
    requiredScopes: Type.Array(Type.String()),
    ownershipScope: Ref(OwnershipScopeSchema),
    risk: Ref(CapabilityRiskSchema),
    available: Type.Boolean(),
  },
  { $id: "Capability" },
);

export const ProviderMetadataSchema = Type.Object({
  id: Type.String({ description: "Provider slug, e.g. slack" }),
  displayName: Type.String(),
  description: Type.String(),
  icon: Type.String(),
  docsUrl: Type.Optional(Type.String({ format: "uri" })),
  kind: Ref(ProviderKindSchema),
  auth: Ref(ProviderAuthSchema),
});

export const ProviderCapabilitiesSchema = Type.Intersect(
  [
    Type.Object({
      capabilities: Type.Array(Ref(CapabilitySummarySchema)),
    }),
    ProviderMetadataSchema,
  ],
  { $id: "ProviderCapabilities" },
);

export const ProviderCapabilitySchema = Type.Intersect(
  [
    Type.Object({
      capability: Ref(CapabilitySchema),
    }),
    ProviderMetadataSchema,
  ],
  { $id: "ProviderCapability" },
);

export type CapabilityMeta = Static<typeof CapabilitySchema>;
export type ProviderCapabilities = Static<typeof ProviderCapabilitiesSchema>;

export const CapabilityEndpointSchema = {
  tags: ["Capabilities"],
  description: "retrieves a capability from a provider",
  querystring: Type.Object({
    orgId: Type.String(),
  }),
  params: Type.Object({
    providerId: Type.String(),
    capabilityId: Type.String(),
  }),
  security: [{ bearerAuth: [] }],
  response: {
    200: Ref(ProviderCapabilitySchema),
    404: Type.Object({
      error: Type.String(),
    }),
  },
};

export const CapabilitiesEndpointSchema = {
  tags: ["Capabilities"],
  description:
    "Returns the catalog of provider capabilities available to the platform.",
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Array(Ref(ProviderCapabilitiesSchema)),
  },
} as const;

export type CapabilitiesEndpoint = typeof CapabilitiesEndpointSchema;
export type CapabilityEndpoint = typeof CapabilityEndpointSchema;
