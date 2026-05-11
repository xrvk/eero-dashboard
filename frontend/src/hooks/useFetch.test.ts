import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFetch, prefetchRequest } from './useFetch';

// Access the module-level cache for cleanup between tests
// We re-import to get a fresh module in each test file run,
// but within a file we need manual cleanup.
const clearCacheHack = () => {
  // prefetchRequest skips if key exists, so we test fresh behavior
  // by using unique keys per test.
};

describe('useFetch', () => {
  beforeEach(() => {
    clearCacheHack();
  });

  it('fetches data and sets loading to false', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] });
    const { result } = renderHook(() => useFetch(fetcher, ['dep1']));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ items: [1, 2, 3] });
    expect(result.current.error).toBeNull();
    expect(result.current.status).toBe('success');
  });

  it('initializes with cached data when cacheKey is prefetched', async () => {
    const cacheKey = '/test/prefetched-endpoint';
    const cachedData = { cached: true, value: 42 };

    // Simulate prefetchRequest storing data
    await act(async () => {
      prefetchRequest(cacheKey, () => Promise.resolve(cachedData));
      // Give the promise time to resolve
      await new Promise((r) => setTimeout(r, 10));
    });

    const fetcher = vi.fn().mockResolvedValue({ cached: false, value: 99 });
    const { result } = renderHook(() => useFetch(fetcher, ['dep1'], {}, cacheKey));

    // Should initialize with cached data — no loading state on first render
    expect(result.current.data).toEqual(cachedData);
    expect(result.current.loading).toBe(false);
    expect(result.current.status).toBe('success');
  });

  it('stores fetched data in cache when cacheKey is provided', async () => {
    const cacheKey = '/test/store-in-cache';
    const fetchedData = { stored: true };
    const fetcher = vi.fn().mockResolvedValue(fetchedData);

    const { result } = renderHook(() => useFetch(fetcher, ['dep1'], {}, cacheKey));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Now mount a second hook with the same cacheKey — should get cached data instantly
    const fetcher2 = vi.fn().mockResolvedValue({ different: true });
    const { result: result2 } = renderHook(() => useFetch(fetcher2, ['dep1'], {}, cacheKey));

    // Should initialize with cached data from the first hook
    expect(result2.current.data).toEqual(fetchedData);
    expect(result2.current.loading).toBe(false);
  });

  it('works without cacheKey (no caching)', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => useFetch(fetcher, ['dep1']));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ value: 1 });
  });

  it('handles fetch errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useFetch(fetcher, ['dep1']));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.status).toBe('error');
    expect(result.current.data).toBeNull();
  });

  it('refetches when deps change', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ value: 'first' })
      .mockResolvedValueOnce({ value: 'second' });

    const { result, rerender } = renderHook(
      ({ dep }) => useFetch(fetcher, [dep]),
      { initialProps: { dep: 'a' } },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 'first' });
    });

    rerender({ dep: 'b' });

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 'second' });
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('prefetchRequest', () => {
  it('calls fetcher and does not call again for same key', async () => {
    const key = '/test/prefetch-dedup';
    const fetcher = vi.fn().mockResolvedValue({ prefetched: true });

    prefetchRequest(key, fetcher);
    await new Promise((r) => setTimeout(r, 10));

    // Second call with same key should be skipped
    const fetcher2 = vi.fn().mockResolvedValue({ different: true });
    prefetchRequest(key, fetcher2);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher2).not.toHaveBeenCalled();
  });
});
