import { useState } from 'react';
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading profiles…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const profiles = data?.profiles ?? [];

  return (
    <div className="profile-manager">
      <div className="section-header">
        <h2>Profiles <span className="badge">{profiles.length}</span></h2>
        <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
      </div>

      <div className="profile-grid">
        {profiles.map((p) => {
          const pid = extractId(p.url);
          const deviceCount = Array.isArray(p.devices) ? p.devices.length : 0;
          return (
            <div key={pid || p.name} className={`profile-card ${p.paused ? 'paused' : ''}`}>
              <div className="profile-header">
                <div className="profile-icon">👤</div>
                <div className="profile-info">
                  <span className="profile-name">{p.name || 'Unnamed'}</span>
                  <span className="profile-devices">{deviceCount} device{deviceCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="profile-status">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={!p.paused}
                      disabled={actionLoading === pid}
                      onChange={(e) => handlePause(pid, !e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <span className="toggle-label">{p.paused ? 'Paused' : 'Active'}</span>
                </div>
              </div>
            </div>
          );
        })}
        {profiles.length === 0 && <p className="empty-text">No profiles configured</p>}
      </div>
    </div>
  );
}
