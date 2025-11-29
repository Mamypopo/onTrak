"use client";

import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3007";

export interface WebSocketMessage {
  type: string;
  deviceId?: string;
  deviceCode?: string;
  data?: any;
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onMessageRef = useRef(onMessage);

  // Update ref when onMessage changes
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = () => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected");
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(message);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        // Only log error if connection is not already closed
        if (ws.readyState !== WebSocket.CLOSED) {
          console.error("WebSocket error:", error);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        
        // Only reconnect if it wasn't a normal closure (code 1000)
        // and not a manual close
        if (event.code !== 1000 && wsRef.current === ws) {
          console.log("WebSocket disconnected, reconnecting...");
          
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          console.log("WebSocket closed normally");
        }
        
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Close connection with normal closure code (1000)
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, []);

  return { isConnected };
}

