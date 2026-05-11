import { request } from './client';
import { prefetchRequest } from '../hooks/useFetch';

export const prefetch = (networkId: string) => {
  // Warm backend cache
  request<{ status: string; cached: number }>(`/prefetch/${networkId}`, { method: 'POST' }).catch(() => {});

  // Warm frontend response cache so first tab visit is instant
  const endpoints = [
    'settings', 'password', 'updates', 'thread', 'routing',
    'security', 'dns', 'sqm', 'forwards', 'reservations',
    'blacklist', 'devices', 'eeros', 'profiles',
  ];
  for (const ep of endpoints) {
    const path = `/networks/${networkId}/${ep}`;
    prefetchRequest(path, () => request(path));
  }
};
