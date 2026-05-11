import { useState, useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { User, X, Plus, LayoutGrid, List, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import * as api from '../../api';
import { extractId, stableSort, _profileOrder } from './utils';
import CreateProfileForm from './CreateProfileForm';
import ProfileDetailPanel from './ProfileDetailPanel';

type ViewMode = 'cards' | 'list';

export default function ProfileManager({ networkId }: { networkId: string }) {
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
