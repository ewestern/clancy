import { Static, Type } from "@sinclair/typebox";
import { Ref } from "./shared.js";

export const FewShotSchema = Type.Object({
  user: Type.String(),
  assistant: Type.String(),
});

export const PromptSpecSchema = Type.Object(
  {
    version: Type.String(),
    system: Type.String(),
    user: Type.Optional(Type.String()),
    schema: Type.Optional(Type.String()),
  },
  { $id: "PromptSpec" },
);

export type PromptSpec = Static<typeof PromptSpecSchema>;

export const PromptParamsSchema = Type.Object({
  provider: Type.String(),
  capability: Type.String(),
  version: Type.String(),
});

export const PromptEndpointSchema = {
  tags: ["Prompt"],
  description: "Retrieve a specific prompt version for a capability.",
  security: [{ bearerAuth: [] }],
  params: PromptParamsSchema,
  response: {
    200: Ref(PromptSpecSchema),
    404: Type.Object({ message: Type.String() }),
  },
} as const;

export type PromptEndpoint = typeof PromptEndpointSchema;
