import { useState, useEffect, useCallback, useMemo } from 'react';
import type { AppTab } from '../features/app/types';

const TAB_TO_PATH: Record<AppTab, string> = {
  devices: '/devices',
  activity: '/health',
  profiles: '/profiles',
  'settings-general': '/settings/general',
  'settings-forwards': '/settings/forwards',
  'settings-reservations': '/settings/reservations',
  'settings-guest': '/settings/guest',
  'settings-blacklist': '/settings/blacklist',
};

const PATH_TO_TAB: Record<string, AppTab> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as AppTab]),
) as Record<string, AppTab>;

const DEFAULT_TAB: AppTab = 'devices';

function parseHash(hash: string): { tab: AppTab; params: URLSearchParams } {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const [path, qs] = raw.split('?');
  const tab = PATH_TO_TAB[path || '/devices'] ?? DEFAULT_TAB;
  const params = new URLSearchParams(qs || '');
  return { tab, params };
}

function buildHash(tab: AppTab, params?: Record<string, string>): string {
  const path = TAB_TO_PATH[tab] ?? TAB_TO_PATH[DEFAULT_TAB];
  const qs = params ? new URLSearchParams(params).toString() : '';
  return qs ? `#${path}?${qs}` : `#${path}`;
}

export function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash || `#${TAB_TO_PATH[DEFAULT_TAB]}`);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    // Set initial hash if empty
    if (!window.location.hash) {
      window.location.hash = TAB_TO_PATH[DEFAULT_TAB];
    }
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { tab, params } = useMemo(() => parseHash(hash), [hash]);

  const setRoute = useCallback((newTab: AppTab, queryParams?: Record<string, string>) => {
    window.location.hash = buildHash(newTab, queryParams);
  }, []);

  return { tab, params, setRoute };
}
