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

export default function ProfileManager({ networkId }: ProfileManagerProps) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getProfiles(networkId),
    [networkId]
  );
  const { data: devicesData } = useFetch(
    () => api.getDevices(networkId),
    [networkId]
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);

  const allDevices = devicesData?.devices ?? [];
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

  const toggleExpand = (pid: string) => {
    setExpandedProfile(prev => prev === pid ? null : pid);
    if (editingProfile && editingProfile !== pid) setEditingProfile(null);
  };

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading profiles…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  return (
    <div className="profile-manager">
      <div className="section-header">
        <span className="results-counter">{profiles.length} profile{profiles.length !== 1 ? 's' : ''}</span>
        <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
      </div>

      <div className="profile-list">
        {profiles.map((p) => {
          const pid = extractId(p.url);
          const profileDevices = Array.isArray(p.devices) ? p.devices : [];
          const isExpanded = expandedProfile === pid;
          const isEditing = editingProfile === pid;

          return (
            <div key={pid || p.name} className={`profile-row ${p.paused ? 'paused' : ''} ${isExpanded ? 'expanded' : ''}`}>
              <div className="profile-header" onClick={() => toggleExpand(pid)}>
                <span className="profile-expand">{isExpanded ? '▾' : '▸'}</span>
                <div className="profile-info">
                  <span className="profile-name">{p.name || 'Unnamed'}</span>
                  <span className="profile-meta">
                    {profileDevices.length} device{profileDevices.length !== 1 ? 's' : ''}
                    {p.paused && <span className="profile-paused-badge">Paused</span>}
                  </span>
                </div>
                <div className="profile-actions" onClick={(e) => e.stopPropagation()}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!p.paused}
                      disabled={actionLoading === pid}
                      onChange={(e) => handlePause(pid, !e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              {isExpanded && (
                <div className="profile-body">
                  <div className="profile-device-table-header">
                    <span className="results-counter">{profileDevices.length} assigned device{profileDevices.length !== 1 ? 's' : ''}</span>
                    <button
                      className="btn-text"
                      onClick={() => setEditingProfile(isEditing ? null : pid)}
                    >
                      {isEditing ? '✕ Cancel' : '✏️ Edit'}
                    </button>
                  </div>

                  {isEditing ? (
                    <DevicePicker
                      networkId={networkId}
                      profileId={pid}
                      currentDeviceUrls={profileDevices.map((pd: api.Device) => pd.url || '')}
                      allDevices={allDevices}
                      onSaved={() => { setEditingProfile(null); refetch(); }}
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
              )}
            </div>
          );
        })}
        {profiles.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">👤</p>
            <p className="empty-text">No profiles configured</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
