import { Static, Type } from "@sinclair/typebox";
import { EventSchema } from "@ewestern/events";

export const WebhookEndpoint = {
  security: [{ bearerAuth: [] }],
  body: EventSchema,
  response: {
    200: Type.Object({
      message: Type.Literal("ok"),
    }),
  },
};
