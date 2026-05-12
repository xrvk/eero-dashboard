import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';

export function BlacklistSettings({ networkId }: { networkId: string }) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getBlacklist(networkId), [networkId]
  );
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleRemove = async (deviceId: string) => {
    if (confirmRemove !== deviceId) { setConfirmRemove(deviceId); return; }
    setRemoving(deviceId);
    try {
      await api.removeFromBlacklist(networkId, deviceId);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setRemoving(null); setConfirmRemove(null); }
  };

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const blacklist = Array.isArray(data) ? data :
    (data as Record<string, unknown>)?.blacklist ? ((data as Record<string, unknown>).blacklist as unknown[]) : [];

  return (
    <div className="settings-page">
      <div className="settings-card">
        <p className="toggle-desc mb-16">
          Permanently blocked devices cannot reconnect until removed.
        </p>

        {(blacklist as Record<string, unknown>[]).length > 0 ? (
          <table className="device-table">
            <thead>
              <tr><th>Device</th><th>MAC</th><th></th></tr>
            </thead>
            <tbody>
              {(blacklist as Record<string, unknown>[]).map((d, i) => {
                const did = String(d.mac || d.url || i);
                return (
                  <tr key={i}>
                    <td>{String(d.display_name || d.hostname || d.nickname || 'Unknown')}</td>
                    <td className="td-mono">{String(d.mac || '—')}</td>
                    <td>
                      <button
                        className={`btn-action btn-delete ${confirmRemove === did ? 'confirming' : ''}`}
                        disabled={removing === did}
                        onClick={() => handleRemove(did)}
                      >
                        {confirmRemove === did ? 'Confirm?' : '✕'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p className="empty-icon">🚫</p>
            <p className="empty-text">No blacklisted devices</p>
          </div>
        )}
      </div>
    </div>
  );
}
