"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type WsStatus = "idle" | "connecting" | "open" | "closed" | "error";

export interface WebSocketEventEnvelope {
  event: string;
  timestamp: string;
  user_id: string;
  data: Record<string, unknown>;
}

interface UseWebSocketOptions {
  token: string | null;
  enabled?: boolean;
  onEvent?: (event: WebSocketEventEnvelope) => void;
}

function getWsBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/$/, "");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const parsed = new URL(apiUrl);
    parsed.protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return "ws://localhost:8000";
  }
}

export function useWebSocket({ token, enabled = true, onEvent }: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>("idle");
  const [lastEvent, setLastEvent] = useState<WebSocketEventEnvelope | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const shouldReconnectRef = useRef<boolean>(true);

  const wsUrl = useMemo(() => {
    if (!token) {
      return null;
    }
    const base = getWsBaseUrl();
    return `${base}/ws?token=${encodeURIComponent(token)}`;
  }, [token]);

  useEffect(() => {
    if (!enabled || !wsUrl) {
      return;
    }

    shouldReconnectRef.current = true;

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
      };

      ws.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data) as WebSocketEventEnvelope;
          setLastEvent(parsed);
          onEvent?.(parsed);
        } catch {
          // Ignore non-JSON control messages like plain "pong".
        }
      };

      ws.onerror = () => {
        setStatus("error");
      };

      ws.onclose = () => {
        setStatus("closed");
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 1500);
        }
      };
    };

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, wsUrl, onEvent]);

  const effectiveStatus: WsStatus = !enabled || !wsUrl ? "idle" : status;
  return { status: effectiveStatus, lastEvent };
}
