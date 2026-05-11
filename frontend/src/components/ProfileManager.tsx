import { useState, useMemo, useEffect, useRef } from 'react';
import { useFetch, prefetchRequest } from '../hooks/useFetch';
import { User, X, Plus, LayoutGrid, List, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import * as api from '../api';
import { request } from '../api/client';

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

// Module-level stable ordering — survives re-renders, reset on network change
const _profileOrder = new Map<string, string[]>();

function stableSort(networkId: string, raw: api.Profile[]): api.Profile[] {
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

interface ProfileManagerProps {
  networkId: string;
}

type ViewMode = 'cards' | 'list';
type DetailTab = 'devices' | 'schedule' | 'blocked-apps';

export default function ProfileManager({ networkId }: ProfileManagerProps) {
  const profilesCacheKey = `/networks/${networkId}/profiles`;
  const { data, loading, error, refetch } = useFetch(
    () => api.getProfiles(networkId),
    [networkId],
    {},
    profilesCacheKey,
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const rawProfiles = useMemo(() => data?.profiles ?? [], [data]);
  const profiles = useMemo(() => stableSort(networkId, rawProfiles), [networkId, rawProfiles]);

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

  const handleDelete = async (profileId: string) => {
    setActionLoading(profileId);
    try {
      await api.deleteProfile(networkId, profileId);
      if (selectedProfile === profileId) setSelectedProfile(null);
      _profileOrder.delete(networkId);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete profile');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRename = async (profileId: string, name: string) => {
    try {
      await api.renameProfile(networkId, profileId, name);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to rename profile');
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
          <button
            className={`btn-create-profile ${showCreateForm ? 'active' : ''}`}
            onClick={() => setShowCreateForm(!showCreateForm)}
            title={showCreateForm ? 'Cancel' : 'Create profile'}
          >
            {showCreateForm ? <X size={16} /> : <Plus size={16} />}<span className="btn-create-label"> New</span>
          </button>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card view"
            ><LayoutGrid size={16} /></button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            ><List size={16} /></button>
          </div>
          <button className="btn-icon" onClick={refetch} title="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>

      {showCreateForm && (
        <CreateProfileForm
          networkId={networkId}
          onCreated={() => {
            setShowCreateForm(false);
            _profileOrder.delete(networkId);
            refetch();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {profiles.length === 0 && !showCreateForm ? (
        <div className="empty-state">
          <p className="empty-icon"><User size={24} /></p>
          <p className="empty-text">No profiles configured</p>
          <p className="empty-subtext">Click <strong>＋ New</strong> to create one</p>
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
                  <span className="profile-icon"><User size={20} /></span>
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
                  <span className="profile-expand">{isSelected ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
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
          onRename={(name) => handleRename(selectedProfile, name)}
          onDelete={() => handleDelete(selectedProfile)}
          isDeleting={actionLoading === selectedProfile}
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
  onRename,
  onDelete,
  isDeleting,
}: {
  networkId: string;
  profile: api.Profile;
  profileId: string;
  onClose: () => void;
  onRefresh: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [tab, setTab] = useState<DetailTab>('devices');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Eager-load schedule + blocked-apps data when panel opens
  useEffect(() => {
    const scheduleKey = `/networks/${networkId}/profiles/${profileId}/schedule`;
    const blockedKey = `/networks/${networkId}/profiles/${profileId}/blocked-apps`;
    prefetchRequest(scheduleKey, () => request(scheduleKey));
    prefetchRequest(blockedKey, () => request(blockedKey));
  }, [networkId, profileId]);

  return (
    <div className="profile-detail-panel">
      <div className="profile-detail-header">
        <div className="profile-detail-title">
          <span className="profile-icon"><User size={20} /></span>
          <InlineEditName
            value={profile.name || 'Unnamed'}
            onSave={onRename}
          />
          {profile.paused && <span className="profile-paused-badge">Paused</span>}
        </div>
        <div className="profile-detail-header-actions">
          {!confirmDelete ? (
            <button
              className="btn-icon btn-icon-danger"
              onClick={() => setConfirmDelete(true)}
              title="Delete profile"
            ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          ) : (
            <div className="delete-confirm">
              <span className="delete-confirm-text">Delete?</span>
              <button
                className="btn-sm btn-danger-solid"
                onClick={() => { onDelete(); setConfirmDelete(false); }}
                disabled={isDeleting}
              >
                {isDeleting ? '…' : 'Yes'}
              </button>
              <button
                className="btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                No
              </button>
            </div>
          )}
          <button className="btn-icon" onClick={onClose} title="Close"><X size={16} /></button>
        </div>
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
    {},
    `/networks/${networkId}/devices`,
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
          {editing ? <><X size={16} /> Cancel</> : 'Edit'}
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
  const cacheKey = `/networks/${networkId}/profiles/${profileId}/schedule`;
  const { data: scheduleData, loading, error, refetch } = useFetch(
    () => api.getProfileSchedule(networkId, profileId),
    [networkId, profileId],
    {},
    cacheKey,
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

  if (error) {
    return (
      <div className="plus-gate">
        <p className="plus-gate-detail">Schedule and bedtime controls failed to load.</p>
      </div>
    );
  }

  const scheduleArray = scheduleData && typeof scheduleData === 'object'
    ? (scheduleData as Record<string, unknown>).schedule
    : null;
  const hasSchedule = Array.isArray(scheduleArray) && scheduleArray.length > 0;

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
            {clearing ? 'Clearing…' : 'Clear schedule'}
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

/* ── Create Profile Form ───────────────────────────────── */

function CreateProfileForm({
  networkId,
  onCreated,
  onCancel,
}: {
  networkId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createProfile(networkId, name.trim());
      onCreated();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create profile');
      setSaving(false);
    }
  };

  return (
    <form className="create-profile-form" onSubmit={handleSubmit}>
      <div className="create-profile-icon"><User size={20} /></div>
      <input
        ref={inputRef}
        type="text"
        className="create-profile-input"
        placeholder="Profile name…"
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={saving}
        maxLength={50}
      />
      <button
        type="submit"
        className="btn-sm btn-primary"
        disabled={saving || !name.trim()}
      >
        {saving ? 'Creating…' : 'Create'}
      </button>
      <button
        type="button"
        className="btn-sm"
        onClick={onCancel}
        disabled={saving}
      >
        Cancel
      </button>
    </form>
  );
}

/* ── Inline Edit Name ──────────────────────────────────── */

function InlineEditName({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <h3
        className="profile-detail-name editable"
        onClick={() => setEditing(true)}
        title="Click to rename"
      >
        {value}
        <span className="edit-hint">✎</span>
      </h3>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="inline-edit-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
      }}
      maxLength={50}
    />
  );
}

/* ── eero Plus Banner ──────────────────────────────────── */

function EeroPlusBanner() {
  return (
    <div className="plus-banner">
      <span className="plus-banner-icon">✦</span>
      <span className="plus-banner-text">Requires <strong>eero Plus</strong></span>
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
