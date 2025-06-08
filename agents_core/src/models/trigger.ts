import { Type } from "@sinclair/typebox";

import { RunIntentEventSchema } from "./events";

export const TriggerEndpoint = {
    tags: ["Triggers"],
    description: "Triggers an agent",
    body: RunIntentEventSchema,
    response: {
        200: Type.Object({
            executionIds: Type.Array(Type.String({ format: "uuid" })),
        }),
    },
}