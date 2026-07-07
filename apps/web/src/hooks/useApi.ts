import { useState, useEffect, useCallback } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Generic data fetching hook.
 * Returns { data, loading, error, refetch } for any async fetch function.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): UseApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({ data: null, loading: false, error: err.message }));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}

/**
 * SSE connection hook.
 * Returns connection status and the latest event.
 */
export function useSSE<T = unknown>(
  connectFn: (onEvent: (data: T) => void) => () => void,
) {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<T | null>(null);

  useEffect(() => {
    const close = connectFn((data: T) => {
      setConnected(true);
      setLastEvent(data);
    });
    return () => {
      close();
      setConnected(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected, lastEvent };
}
