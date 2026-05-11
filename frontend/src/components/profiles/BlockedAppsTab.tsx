import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';
import EeroPlusBanner from './EeroPlusBanner';
import { extractBlockedApps } from './utils';

export default function BlockedAppsTab({ networkId, profileId }: { networkId: string; profileId: string }) {
  const cacheKey = `/networks/${networkId}/profiles/${profileId}/blocked-apps`;
  const { data: blockedData, loading, error, refetch } = useFetch(
    () => api.getBlockedApps(networkId, profileId),
    [networkId, profileId],
    {},
    cacheKey,
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync initial state from API response
  if (blockedData && !initialized) {
    const apps = extractBlockedApps(blockedData);
    setSelected(new Set(apps));
    setInitialized(true);
  }

  const toggle = (app: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(app)) next.delete(app);
      else next.add(app);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setBlockedApps(networkId, profileId, [...selected]);
      await refetch();
      setInitialized(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update blocked apps');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !initialized) {
    return <div className="schedule-loading"><div className="spinner" /> Loading blocked apps…</div>;
  }

  if (error) {
    return (
      <div className="plus-gate">
        <EeroPlusBanner />
        <p className="plus-gate-detail">Blocked apps failed to load. This feature may require an active eero Plus subscription.</p>
      </div>
    );
  }

  const knownApps = [
    'YouTube', 'Netflix', 'TikTok', 'Instagram', 'Snapchat',
    'Facebook', 'Twitter', 'Reddit', 'Discord', 'Twitch',
    'Spotify', 'Pinterest', 'WhatsApp', 'Telegram',
  ];

  const currentApps = extractBlockedApps(blockedData);
  const allApps = [...new Set([...knownApps, ...currentApps])].sort();

  return (
    <div className="blocked-apps-section">
      <EeroPlusBanner />
      <div className="blocked-apps-list">
        {allApps.map(app => (
          <label key={app} className={`blocked-app-item ${selected.has(app) ? 'blocked' : ''}`}>
            <input
              type="checkbox"
              checked={selected.has(app)}
              onChange={() => toggle(app)}
            />
            <span className="blocked-app-name">{app}</span>
          </label>
        ))}
      </div>
      <div className="blocked-apps-footer">
        <span className="picker-count">{selected.size} blocked</span>
        <button className="btn-primary btn-sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
