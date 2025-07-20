import { createContext, useContext } from "react";
import type { WebsocketMessage } from "../types";

export interface Subscriber<T = unknown> {
  (payload: T): void;
}

export interface WebSocketContextType {
  /** Send a JSON-serializable message */
  send: (data: WebsocketMessage) => void;
  /** Subscribe to a named event coming from the server. Returns an unsubscribe fn */
  subscribe: (
    event: string,
    callback: Subscriber<WebsocketMessage>,
  ) => () => void;
  /** ReadyState from the underlying WebSocket */
  readyState: number;
}

export const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export function useWebSocketCtx() {
  const ctx = useContext(WebSocketContext);
  if (ctx === undefined) {
    throw new Error("useWebSocketCtx must be used within a WebSocketProvider");
  }
  return ctx;
}
