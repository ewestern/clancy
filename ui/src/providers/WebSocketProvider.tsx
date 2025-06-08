import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import useWebSocket from "react-use-websocket";
import { Subscriber, WebSocketContext, WebSocketContextType } from "../context/WebSocketContext";
import { useAuth } from "@clerk/react-router";
import type { WizardWebSocketMessage } from "../types";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001/ws";

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const updateUrl = useCallback(async () => {
    const token = await getToken();
    setWsUrl(`${WS_URL}?token=${token}`);
  }, [getToken]);

  useEffect(() => {
    updateUrl();
  }, []); 

  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(wsUrl, {
    shouldReconnect: () => true,
    onError: (error) => {
      updateUrl();
      console.error("WebSocket error:", error);
    },
    share: true, // ensures a single native socket for the whole tab
  });
  console.log("READY STATE", readyState);
  console.log("LAST JSON MESSAGE", lastJsonMessage);

  // Map<eventName, Set<callback>>
  const subscribers = useRef(new Map<string, Set<Subscriber>>());

  // Fan-out incoming messages to relevant subscribers
  useEffect(() => {
    if (!lastJsonMessage) return;

    const { event, payload } = lastJsonMessage as {
      event?: string;
      payload?: unknown;
    };

    if (event && subscribers.current.has(event)) {
      subscribers.current.get(event)!.forEach((cb) => cb(payload));
    }

    // Handle wizard-specific events
    if (event && ['wizard_update', 'workflow_update', 'provider_connected', 'chat_message', 'completion_check', 'job_analysis'].includes(event)) {
      const wizardEvent = lastJsonMessage as WizardWebSocketMessage;
      if (subscribers.current.has('wizard_events')) {
        subscribers.current.get('wizard_events')!.forEach((cb) => cb(wizardEvent));
      }
    }
  }, [lastJsonMessage]);

  const subscribe = (event: string, callback: Subscriber) => {
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

  // Wizard-specific subscription helper
  const subscribeToWizardEvents = (callback: Subscriber<WizardWebSocketMessage>) => {
    return subscribe('wizard_events', (payload: unknown) => {
      callback(payload as WizardWebSocketMessage);
    });
  };

  // Wizard-specific send helper
  const sendWizardMessage = (message: WizardWebSocketMessage) => {
    sendJsonMessage({
      event: message.type,
      payload: message.payload
    });
  };

  const value: WebSocketContextType = useMemo(
    () => ({
      send: sendJsonMessage,
      sendWizardMessage,
      subscribe,
      subscribeToWizardEvents,
      readyState,
    }),
    [sendJsonMessage, readyState],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}
