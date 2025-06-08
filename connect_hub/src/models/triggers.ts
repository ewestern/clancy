import { Static, Type } from "@sinclair/typebox";
import { Ref } from "./shared.js"


export const TriggerRegistrationSchema = Type.Object({
  id: Type.ReadonlyOptional(Type.String({ readOnly: true })),
  agentId: Type.String(),
  triggerId: Type.String(),
  connection: Type.ReadonlyOptional(Type.Object({
    id: Type.String(),
    orgId: Type.String(),
    providerId: Type.String(),
    externalAccountMetadata: Type.Any(),
    status: Type.String(),
  }, {
    readOnly: true,
  })),
  connectionId: Type.String(),
  metadata: Type.Record(Type.String(), Type.Any()),
  expiresAt: Type.String(),
  createdAt: Type.ReadonlyOptional(Type.String({ readOnly: true })),
  updatedAt: Type.ReadonlyOptional(Type.String({ readOnly: true })),
}, {
    $id: "TriggerRegistration",
});

export const CreateTriggerRegistrationEndpoint = {
    tags: ["Triggers"],
    body: Ref(TriggerRegistrationSchema),
    response: {
        200: Ref(TriggerRegistrationSchema),
    }

}

export type TriggerRegistration = Static<typeof TriggerRegistrationSchema>;