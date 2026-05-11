import type { Profile } from '../../api';

export function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

// Module-level stable ordering — survives re-renders, reset on network change
export const _profileOrder = new Map<string, string[]>();

export function stableSort(networkId: string, raw: Profile[]): Profile[] {
  if (raw.length === 0) return raw;
  const ids = raw.map(p => extractId(p.url) || p.name || '');
  const saved = _profileOrder.get(networkId);
  if (!saved) {
    _profileOrder.set(networkId, ids);
    return raw;
  }
  const orderMap = new Map(saved.map((id, i) => [id, i]));
  const sorted = [...raw].sort((a, b) => {
    const aIdx = orderMap.get(extractId(a.url) || a.name || '') ?? Infinity;
    const bIdx = orderMap.get(extractId(b.url) || b.name || '') ?? Infinity;
    return aIdx - bIdx;
  });
  // Add any new profiles to the saved order
  const sortedIds = sorted.map(p => extractId(p.url) || p.name || '');
  if (sortedIds.some(id => !orderMap.has(id))) {
    _profileOrder.set(networkId, sortedIds);
  }
  return sorted;
}

export function extractBlockedApps(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.applications)) return obj.applications as string[];
  if (Array.isArray(obj.blocked)) return obj.blocked as string[];
  if (Array.isArray(data)) return data as string[];
  return [];
}
