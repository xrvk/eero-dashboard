import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchOptions {
  retries?: number;
  retryDelayMs?: number;
}

type Fetcher<T> = (context?: { signal?: AbortSignal }) => Promise<T>;

// Module-level cache keyed by URL path — survives unmount/remount (tab switching).
const _responseCache = new Map<string, unknown>();

/**
 * Eagerly fetch a URL and store in the response cache.
 * Call this at app level to warm data before components mount.
 */
export function prefetchRequest<T>(path: string, fetcher: () => Promise<T>): void {
  if (_responseCache.has(path)) return;
  fetcher().then((result) => _responseCache.set(path, result)).catch(() => {});
}

export function useFetch<T>(
  fetcher: Fetcher<T>,
  deps: unknown[] = [],
  options: UseFetchOptions = {},
  /** Stable cache key (e.g. the API path). If omitted, no cross-mount caching. */
  cacheKey?: string,
) {
  const cached = cacheKey ? (_responseCache.get(cacheKey) as T | undefined) : undefined;

  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(cached == null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    cached != null ? 'success' : 'idle',
  );
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

    // Only show loading spinner if we don't already have data
    const hasData = cacheKey ? _responseCache.has(cacheKey) : false;
    if (!hasData) {
      setLoading(true);
      setStatus('loading');
    }
    setError(null);
    try {
      for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
          const result = await fetcherRef.current({ signal: controller.signal });
          if (controller.signal.aborted) return;
          setData(result);
          setStatus('success');
          if (cacheKey) _responseCache.set(cacheKey, result);
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
  }, [options.retries, options.retryDelayMs, cacheKey]);

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

    // Re-fetch if a previous fetch was aborted (e.g. React StrictMode remount)
    const wasAborted = abortRef.current?.signal.aborted ?? false;

    if (depsChanged || wasAborted) {
      prevDepsRef.current = [...deps];
      void executeFetch();
    }
  }, [deps, executeFetch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { data, loading, error, status, refetch, retry: refetch, cancel };
}
