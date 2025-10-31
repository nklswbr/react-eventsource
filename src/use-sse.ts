import { useState, useEffect, useRef } from "react";
import { fetchEventSource, type EventSourceMessage } from "@microsoft/fetch-event-source";

export interface UseSSEOptions {
  url: string;
  headers?: Record<string, string>;
  method?: string;
  body?: string | FormData;
  onMessage?: (message: EventSourceMessage) => void;
  onOpen?: (response: Response) => void;
  onError?: (error: unknown) => void;
  fetch?: typeof window.fetch;
  openWhenHidden?: boolean;
}

export interface UseSSEResult {
  readyState: number;
  close: () => void;
  reconnect: () => void;
}

export function useSSE(options: UseSSEOptions): UseSSEResult {
  const { url, headers, method, body, onMessage, onOpen, onError, fetch: customFetch, openWhenHidden } = options;
  const [readyState, setReadyState] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const connect = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setReadyState(0);

    fetchEventSource(url, {
      method: method || 'GET',
      headers: headers,
      body: body,
      signal: controller.signal,
      fetch: customFetch,
      openWhenHidden: openWhenHidden ?? true,
      
      async onopen(response) {
        setReadyState(1);
        onOpen?.(response);
      },
      
      onmessage(message) {
        onMessage?.(message);
      },
      
      onerror(err) {
        setReadyState(2);
        onError?.(err);
      },
    });
  };

  const close = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      setReadyState(2);
    }
  };

  const reconnect = () => {
    connect();
  };

  useEffect(() => {
    connect();
    return () => {
      close();
    };
  }, [url, headers, method, body, onMessage, onOpen, onError]);

  return {
    readyState,
    close,
    reconnect,
  };
}
