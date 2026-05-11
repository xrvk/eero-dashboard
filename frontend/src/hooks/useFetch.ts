import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchOptions {
  retries?: number;
  retryDelayMs?: number;
}

type Fetcher<T> = (context?: { signal?: AbortSignal }) => Promise<T>;

export function useFetch<T>(
  fetcher: Fetcher<T>,
  deps: unknown[] = [],
  options: UseFetchOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const fetcherRef = useRef(fetcher);
  const prevDepsRef = useRef<unknown[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const executeFetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const retries = Math.max(0, options.retries ?? 0);
    const retryDelayMs = options.retryDelayMs ?? 250;

    setLoading(true);
    setStatus('loading');
    setError(null);
    try {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          const result = await fetcherRef.current({ signal: controller.signal });
          if (controller.signal.aborted) return;
          setData(result);
          setStatus('success');
          return;
        } catch (e) {
          if (controller.signal.aborted) return;
          const isFinalAttempt = attempt >= retries;
          if (isFinalAttempt) {
            setError(e instanceof Error ? e.message : 'Request failed');
            setStatus('error');
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [options.retries, options.retryDelayMs]);

  const refetch = useCallback(() => {
    void executeFetch();
  }, [executeFetch]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setStatus('idle');
  }, []);

  useEffect(() => {
    const previous = prevDepsRef.current;
    const depsChanged =
      previous === null
      || previous.length !== deps.length
      || previous.some((value, index) => !Object.is(value, deps[index]));

    if (depsChanged) {
      prevDepsRef.current = [...deps];
      void executeFetch();
    }
  }, [deps, executeFetch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { data, loading, error, status, refetch, retry: refetch, cancel };
}
