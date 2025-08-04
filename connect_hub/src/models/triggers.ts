import { Static, Type } from "@sinclair/typebox";
import { Nullable, Ref } from "./shared.js";

const ParamsSchema = Type.Unknown({
  description:
    "JSON schema defining the parameters that should be used when registering a trigger.",
});

export const TriggerRegistrationSchema = Type.Object(
  {
    id: Type.ReadonlyOptional(Type.String({ readOnly: true })),
    agentId: Type.String(),
    providerId: Type.String(),
    triggerId: Type.String(),
    connection: Type.ReadonlyOptional(
      Type.Object(
        {
          id: Type.String(),
          orgId: Type.String(),
          userId: Type.String(),
          providerId: Type.String(),
          externalAccountMetadata: Type.Any(),
          status: Type.String(),
        },
        {
          readOnly: true,
        },
      ),
    ),
    params: Type.Record(Type.String(), Type.Any()),
    expiresAt: Type.String(),
    createdAt: Type.ReadonlyOptional(Type.String({ readOnly: true })),
    updatedAt: Type.ReadonlyOptional(Type.String({ readOnly: true })),
  },
  {
    $id: "TriggerRegistration",
  },
);

export const TriggerSchema = Type.Object(
  {
    id: Type.String(),
    providerId: Type.String(),
    paramsSchema: ParamsSchema,
    description: Type.String(),
  },
  {
    $id: "Trigger",
  },
);

export const GetTriggersEndpoint = {
  tags: ["Triggers"],
  response: {
    200: Type.Array(TriggerSchema),
  },
};

export const CreateTriggerRegistrationEndpoint = {
  tags: ["Triggers"],
  body: Ref(TriggerRegistrationSchema),
  response: {
    200: Ref(TriggerRegistrationSchema),
  },
};

export type TriggerRegistration = Static<typeof TriggerRegistrationSchema>;
