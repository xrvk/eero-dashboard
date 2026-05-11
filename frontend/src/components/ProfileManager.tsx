import { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

interface ProfileManagerProps {
  networkId: string;
}

type ViewMode = 'cards' | 'list';
type DetailTab = 'devices' | 'schedule' | 'blocked-apps';

export default function ProfileManager({ networkId }: ProfileManagerProps) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getProfiles(networkId),
    [networkId],
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const profiles = data?.profiles ?? [];

  const handlePause = async (profileId: string, paused: boolean) => {
    setActionLoading(profileId);
    try {
      await api.pauseProfile(networkId, profileId, paused);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleSelect = (pid: string) => {
    setSelectedProfile(prev => prev === pid ? null : pid);
  };

  if (loading && profiles.length === 0) {
    return <div className="card loading-card"><div className="spinner" /> Loading profiles…</div>;
  }
  if (error) return <div className="card error-card">Error: {error}</div>;

  const selected = profiles.find(p => extractId(p.url) === selectedProfile);

  return (
    <div className="profile-manager">
      <div className="section-header">
        <span className="results-counter">{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</span>
        <div className="profile-header-actions">
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card view"
            >▦</button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >☰</button>
          </div>
          <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="empty-state">
          <p className="empty-icon">👤</p>
          <p className="empty-text">No profiles configured</p>
          <p className="empty-subtext">Profiles are created in the eero app</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="profile-grid">
          {profiles.map(p => {
            const pid = extractId(p.url);
            const deviceCount = Array.isArray(p.devices) ? p.devices.length : 0;
            const isSelected = selectedProfile === pid;
            return (
              <div
                key={pid || p.name}
                className={`profile-card ${p.paused ? 'paused' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleSelect(pid)}
              >
                <div className="profile-header">
                  <span className="profile-icon">👤</span>
                  <div className="profile-info">
                    <span className="profile-name">{p.name || 'Unnamed'}</span>
                    <span className="profile-devices">
                      {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="profile-status" onClick={e => e.stopPropagation()}>
                    {p.paused && <span className="profile-paused-badge">Paused</span>}
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={!p.paused}
                        disabled={actionLoading === pid}
                        onChange={e => handlePause(pid, !e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="profile-list">
          {profiles.map(p => {
            const pid = extractId(p.url);
            const deviceCount = Array.isArray(p.devices) ? p.devices.length : 0;
            const isSelected = selectedProfile === pid;
            return (
              <div
                key={pid || p.name}
                className={`profile-row ${p.paused ? 'paused' : ''} ${isSelected ? 'expanded' : ''}`}
              >
                <div className="profile-header" onClick={() => toggleSelect(pid)}>
                  <span className="profile-expand">{isSelected ? '▾' : '▸'}</span>
                  <div className="profile-info">
                    <span className="profile-name">{p.name || 'Unnamed'}</span>
                    <span className="profile-meta">
                      {deviceCount} device{deviceCount !== 1 ? 's' : ''}
                      {p.paused && <span className="profile-paused-badge">Paused</span>}
                    </span>
                  </div>
                  <div className="profile-actions" onClick={e => e.stopPropagation()}>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={!p.paused}
                        disabled={actionLoading === pid}
                        onChange={e => handlePause(pid, !e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && selectedProfile && (
        <ProfileDetailPanel
          networkId={networkId}
          profile={selected}
          profileId={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}

/* ── Profile Detail Panel ──────────────────────────────── */

function ProfileDetailPanel({
  networkId,
  profile,
  profileId,
  onClose,
  onRefresh,
}: {
  networkId: string;
  profile: api.Profile;
  profileId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>('devices');

  return (
    <div className="profile-detail-panel">
      <div className="profile-detail-header">
        <div className="profile-detail-title">
          <span className="profile-icon">👤</span>
          <h3>{profile.name || 'Unnamed'}</h3>
          {profile.paused && <span className="profile-paused-badge">Paused</span>}
        </div>
        <button className="btn-icon" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="profile-detail-tabs">
        <button
          className={`profile-detail-tab ${tab === 'devices' ? 'active' : ''}`}
          onClick={() => setTab('devices')}
        >
          Devices
        </button>
        <button
          className={`profile-detail-tab ${tab === 'schedule' ? 'active' : ''}`}
          onClick={() => setTab('schedule')}
        >
          Schedule
        </button>
        <button
          className={`profile-detail-tab ${tab === 'blocked-apps' ? 'active' : ''}`}
          onClick={() => setTab('blocked-apps')}
        >
          Blocked Apps
        </button>
      </div>

      <div className="profile-detail-body">
        {tab === 'devices' && (
          <DevicesTab networkId={networkId} profileId={profileId} profile={profile} onRefresh={onRefresh} />
        )}
        {tab === 'schedule' && (
          <ScheduleTab networkId={networkId} profileId={profileId} />
        )}
        {tab === 'blocked-apps' && (
          <BlockedAppsTab networkId={networkId} profileId={profileId} />
        )}
      </div>
    </div>
  );
}

/* ── Devices Tab ───────────────────────────────────────── */

function DevicesTab({
  networkId,
  profileId,
  profile,
  onRefresh,
}: {
  networkId: string;
  profileId: string;
  profile: api.Profile;
  onRefresh: () => void;
}) {
  const { data: devicesData } = useFetch(
    () => api.getDevices(networkId),
    [networkId],
  );
  const [editing, setEditing] = useState(false);

  const allDevices = devicesData?.devices ?? [];
  const profileDevices = Array.isArray(profile.devices) ? profile.devices : [];

  return (
    <div>
      <div className="profile-device-table-header">
        <span className="results-counter">
          {profileDevices.length} assigned device{profileDevices.length !== 1 ? 's' : ''}
        </span>
        <button
          className="btn-text"
          onClick={() => setEditing(!editing)}
        >
          {editing ? '✕ Cancel' : '✏️ Edit'}
        </button>
      </div>

      {editing ? (
        <DevicePicker
          networkId={networkId}
          profileId={profileId}
          currentDeviceUrls={profileDevices.map((pd: api.Device) => pd.url || '')}
          allDevices={allDevices}
          onSaved={() => { setEditing(false); onRefresh(); }}
        />
      ) : (
        <div className="profile-device-rows">
          {profileDevices.length === 0 ? (
            <p className="empty-text" style={{ padding: '12px 0' }}>No devices assigned</p>
          ) : (
            profileDevices.map((pd: api.Device) => (
              <div key={pd.mac || extractId(pd.url)} className="profile-device-row">
                <span className={`profile-device-status ${pd.connected ? 'online' : 'offline'}`}>●</span>
                <span className="profile-device-name">{pd.display_name || pd.hostname || pd.mac || 'Unknown'}</span>
                {pd.ip && <span className="profile-device-ip">{pd.ip}</span>}
                <span className="profile-device-type">{pd.device_type || ''}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Schedule Tab (Bedtime) ────────────────────────────── */

function ScheduleTab({ networkId, profileId }: { networkId: string; profileId: string }) {
  const { data: scheduleData, loading, refetch } = useFetch(
    () => api.getProfileSchedule(networkId, profileId),
    [networkId, profileId],
  );
  const [weekdayStart, setWeekdayStart] = useState('21:00');
  const [weekdayEnd, setWeekdayEnd] = useState('07:00');
  const [weekendStart, setWeekendStart] = useState('22:00');
  const [weekendEnd, setWeekendEnd] = useState('08:00');
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSaveWeekday = async () => {
    setSaving(true);
    try {
      await api.setWeekdayBedtime(networkId, profileId, weekdayStart, weekdayEnd);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set weekday bedtime');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeekend = async () => {
    setSaving(true);
    try {
      await api.setWeekendBedtime(networkId, profileId, weekendStart, weekendEnd);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set weekend bedtime');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await api.clearProfileSchedule(networkId, profileId);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to clear schedule');
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <div className="schedule-loading"><div className="spinner" /> Loading schedule…</div>;

  const hasSchedule = scheduleData && typeof scheduleData === 'object' && Object.keys(scheduleData).length > 0;

  return (
    <div className="schedule-section">
      {hasSchedule && (
        <div className="schedule-current">
          <span className="schedule-active-badge">Schedule active</span>
          <button
            className="btn-text btn-danger"
            onClick={handleClear}
            disabled={clearing}
          >
            {clearing ? 'Clearing…' : '🗑 Clear schedule'}
          </button>
        </div>
      )}

      <div className="bedtime-group">
        <h4>Weekday Bedtime</h4>
        <div className="bedtime-inputs">
          <label>
            <span>Start</span>
            <input type="time" value={weekdayStart} onChange={e => setWeekdayStart(e.target.value)} />
          </label>
          <span className="bedtime-arrow">→</span>
          <label>
            <span>End</span>
            <input type="time" value={weekdayEnd} onChange={e => setWeekdayEnd(e.target.value)} />
          </label>
          <button className="btn-sm" onClick={handleSaveWeekday} disabled={saving}>
            {saving ? '…' : 'Set'}
          </button>
        </div>
      </div>

      <div className="bedtime-group">
        <h4>Weekend Bedtime</h4>
        <div className="bedtime-inputs">
          <label>
            <span>Start</span>
            <input type="time" value={weekendStart} onChange={e => setWeekendStart(e.target.value)} />
          </label>
          <span className="bedtime-arrow">→</span>
          <label>
            <span>End</span>
            <input type="time" value={weekendEnd} onChange={e => setWeekendEnd(e.target.value)} />
          </label>
          <button className="btn-sm" onClick={handleSaveWeekend} disabled={saving}>
            {saving ? '…' : 'Set'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Blocked Apps Tab ──────────────────────────────────── */

function BlockedAppsTab({ networkId, profileId }: { networkId: string; profileId: string }) {
  const { data: blockedData, loading, refetch } = useFetch(
    () => api.getBlockedApps(networkId, profileId),
    [networkId, profileId],
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

  const knownApps = [
    'YouTube', 'Netflix', 'TikTok', 'Instagram', 'Snapchat',
    'Facebook', 'Twitter', 'Reddit', 'Discord', 'Twitch',
    'Spotify', 'Pinterest', 'WhatsApp', 'Telegram',
  ];

  const currentApps = extractBlockedApps(blockedData);
  const allApps = [...new Set([...knownApps, ...currentApps])].sort();

  return (
    <div className="blocked-apps-section">
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

/* ── Device Picker (unchanged logic, extracted) ────────── */

function DevicePicker({ networkId, profileId, currentDeviceUrls, allDevices, onSaved }: {
  networkId: string;
  profileId: string;
  currentDeviceUrls: string[];
  allDevices: api.Device[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentDeviceUrls.filter(Boolean)));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return allDevices;
    const q = search.toLowerCase();
    return allDevices.filter(d => {
      const name = (d.display_name || d.hostname || '').toLowerCase();
      const mac = (d.mac || '').toLowerCase();
      return name.includes(q) || mac.includes(q);
    });
  }, [allDevices, search]);

  const toggle = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setProfileDevices(networkId, profileId, [...selected]);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update devices');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (() => {
    const orig = new Set(currentDeviceUrls.filter(Boolean));
    if (orig.size !== selected.size) return true;
    for (const u of selected) if (!orig.has(u)) return true;
    return false;
  })();

  return (
    <div className="device-picker">
      <input
        type="text"
        className="picker-search"
        placeholder="Search devices…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="picker-list">
        {filtered.map((d) => {
          const url = d.url || '';
          const isSelected = selected.has(url);
          return (
            <label key={d.mac || url} className={`picker-item ${isSelected ? 'selected' : ''}`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(url)} />
              <span className="picker-name">{d.display_name || d.hostname || d.mac || 'Unknown'}</span>
              {d.connected && <span className="picker-online">●</span>}
            </label>
          );
        })}
      </div>
      <div className="picker-actions">
        <span className="picker-count">{selected.size} selected</span>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────── */

function extractBlockedApps(data: unknown): string[] {
  if (!data || typeof data !== 'object') return [];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.applications)) return obj.applications as string[];
  if (Array.isArray(obj.blocked)) return obj.blocked as string[];
  if (Array.isArray(data)) return data as string[];
  return [];
}
