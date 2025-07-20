import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import useWebSocket from "react-use-websocket";
import {
  Subscriber,
  WebSocketContext,
  WebSocketContextType,
} from "../context/WebSocketContext";
import { useAuth } from "@clerk/react-router";
import type { WebsocketMessage } from "../types";

const WS_URL = import.meta.env.VITE_AGENTS_CORE_URL!;

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const updateUrl = useCallback(async () => {
    const token = await getToken();
    setWsUrl(`${WS_URL}/ws?token=${token}`);
  }, [getToken]);

  useEffect(() => {
    updateUrl();
  }, []);

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
    onClose: () => {
      updateUrl();
    },
    onError: (error) => {
      updateUrl();
      console.error("WebSocket error:", error);
    },
    share: true, // ensures a single native socket for the whole tab
  });
  console.log("LAST JSON MESSAGE", lastJsonMessage);
  // Map<eventName, Set<callback>>
  const subscribers = useRef(
    new Map<string, Set<Subscriber<WebsocketMessage>>>(),
  );

  // Fan-out incoming messages by top-level "type"
  useEffect(() => {
    if (!lastJsonMessage) return;

    if (
      typeof lastJsonMessage === "object" &&
      lastJsonMessage !== null &&
      "type" in lastJsonMessage
    ) {
      const message = lastJsonMessage as WebsocketMessage;
      const key = message.type;
      if (subscribers.current.has(key)) {
        subscribers.current.get(key)!.forEach((cb) => cb(message));
      }
    }
  }, [lastJsonMessage]);

  const subscribe = (event: string, callback: Subscriber<WebsocketMessage>) => {
    if (!subscribers.current.has(event)) {
      subscribers.current.set(event, new Set());
    }
    subscribers.current.get(event)!.add(callback);

    // Unsubscribe helper
    return () => {
      const set = subscribers.current.get(event);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) {
        subscribers.current.delete(event);
      }
    };
  };

  const value: WebSocketContextType = useMemo(
    () => ({
      send: (message: WebsocketMessage) => sendJsonMessage(message),
      subscribe: (event: string, callback: Subscriber<WebsocketMessage>) =>
        subscribe(event, callback),
      readyState,
    }),
    [sendJsonMessage, readyState],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
