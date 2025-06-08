import { Static, Type } from "@sinclair/typebox";
import { StringEnum } from "./shared";

export enum WebSocketMessageType {
    JOB_DESCRIPTION = "JOB_DESCRIPTION",
    HUMAN_INPUT = "HUMAN_INPUT",
    CAPABILITY_SUGGESTIONS = "CAPABILITY_SUGGESTIONS",
    CAPABILITIES_SELECTED = "CAPABILITIES_SELECTED",
}

export const WebSocketMessageTypeSchema = StringEnum([
    WebSocketMessageType.JOB_DESCRIPTION,
    WebSocketMessageType.HUMAN_INPUT,
    WebSocketMessageType.CAPABILITY_SUGGESTIONS,
    WebSocketMessageType.CAPABILITIES_SELECTED,
], {$id: "WebSocketMessageType"});

export const WebSocketMessageSchema = Type.Object({
    type: Type.String(),
    data: Type.Any(),
});

export type WebSocketMessage = Static<typeof WebSocketMessageSchema>;

//export const WebSocketEndpoint