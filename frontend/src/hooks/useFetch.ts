import { useState, useEffect, useCallback, useRef } from 'react';

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  const prevDepsRef = useRef<unknown[] | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const executeFetch = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcherRef.current()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const refetch = useCallback(() => {
    executeFetch();
  }, [executeFetch]);

  useEffect(() => {
    const previous = prevDepsRef.current;
    const depsChanged =
      previous === null
      || previous.length !== deps.length
      || previous.some((value, index) => !Object.is(value, deps[index]));

    if (depsChanged) {
      prevDepsRef.current = [...deps];
      executeFetch();
    }
  }, [deps, executeFetch]);

  return { data, loading, error, refetch };
}
