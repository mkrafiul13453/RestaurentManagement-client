"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function useRealtimeUpdates(onUpdate, eventNames) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const serverUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!serverUrl) return undefined;

    const socket = io(serverUrl, {
      autoConnect: false,
      withCredentials: true,
    });
    const synchronize = () => onUpdate();
    socket.on("connect", () => {
      setConnected(true);
      synchronize();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    for (const eventName of eventNames.split(",")) {
      socket.on(eventName, synchronize);
    }
    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [onUpdate]);

  return connected;
}

export function useKitchenRealtime(onUpdate) {
  return useRealtimeUpdates(onUpdate, "kitchen:order-updated");
}

export function useOrderRealtime(onUpdate) {
  return useRealtimeUpdates(onUpdate, "order:updated,kitchen:order-updated");
}
