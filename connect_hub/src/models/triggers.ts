import { Static, Type } from "@sinclair/typebox";
import { ErrorSchema, Nullable, Ref } from "./shared.js";

const ParamsSchema = Type.Unknown({
  description:
    "JSON schema defining the parameters that should be used when registering a trigger.",
});
const OptionsRequestSchema = Type.Unknown({
  description:
    "JSON schema defining the parameters an agent may use when requesting options for a trigger.",
});

export const TriggerRegistrationSchema = Type.Object(
  {
    id: Type.ReadonlyOptional(Type.String({ readOnly: true })),
    orgId: Type.String(),
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
    expiresAt: Type.Optional(Type.String()),
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
    displayName: Type.String(),
    paramsSchema: ParamsSchema,
    description: Type.String(),
    eventDetailsSchema: Type.Unknown(),
    optionsRequestSchema: Type.Optional(OptionsRequestSchema),
  },
  {
    $id: "Trigger",
  },
);

export const GetTriggersEndpoint = {
  tags: ["Triggers"],
  security: [{ bearerAuth: [] }],
  response: {
    200: Type.Array(Ref(TriggerSchema)),
  },
};

export const GetTriggerEndpoint = {
  tags: ["Triggers"],
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    providerId: Type.String(),
    triggerId: Type.String(),
  }),
  response: {
    200: Ref(TriggerSchema),
    404: Ref(ErrorSchema),
    400: Ref(ErrorSchema),
  },
};

export const CreateTriggerRegistrationEndpoint = {
  tags: ["Triggers"],
  security: [{ bearerAuth: [] }],
  body: Ref(TriggerRegistrationSchema),
  response: {
    200: Ref(TriggerRegistrationSchema),
    400: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
    401: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
  },
};
export const GetTriggerParamOptionsEndpoint = {
  tags: ["Triggers"],
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    providerId: Type.String(),
    triggerId: Type.String(),
  }),
  response: {
    200: Type.Object({
      options: Type.Record(Type.String(), Type.Unknown()),
    }),
    401: Ref(ErrorSchema),
    404: Ref(ErrorSchema),
    400: Ref(ErrorSchema)
  },
};

export const SubscribeTriggerRegistrationEndpoint = {
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  body: Ref(TriggerRegistrationSchema),
  response: {
    200: Type.Object({ status: Type.Literal("ok") }),
    400: Type.Object({
      error: Type.String(),
      message: Type.String(),
    }),
  },
};

export type TriggerRegistration = Static<typeof TriggerRegistrationSchema>;
