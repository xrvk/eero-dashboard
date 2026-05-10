import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface EeroNodesProps {
  networkId: string;
}

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

export default function EeroNodes({ networkId }: EeroNodesProps) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getEeros(networkId),
    [networkId]
  );
  const [rebooting, setRebooting] = useState<string | null>(null);
  const [confirmReboot, setConfirmReboot] = useState<string | null>(null);

  const handleReboot = async (eeroId: string) => {
    setRebooting(eeroId);
    try {
      await api.rebootEero(networkId, eeroId);
      setConfirmReboot(null);
      setTimeout(refetch, 3000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Reboot failed');
    } finally {
      setRebooting(null);
    }
  };

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading nodes…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const eeros = data?.eeros ?? [];

  return (
    <div className="eero-nodes">
      {confirmReboot && (
        <div className="confirm-overlay" onClick={() => setConfirmReboot(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>🔄 Reboot this node? It will be offline for ~1 minute.</p>
            <div className="confirm-actions">
              <button className="btn-confirm btn-danger" onClick={() => handleReboot(confirmReboot)}>
                {rebooting ? 'Rebooting…' : 'Reboot'}
              </button>
              <button className="btn-cancel" onClick={() => setConfirmReboot(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="section-header">
        <h2>eero Nodes</h2>
        <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
      </div>
      <div className="node-grid">
        {eeros.map((node, i) => {
          const eeroId = extractId(node.url);
          return (
            <div
              key={node.serial || i}
              className={`node-card ${node.status === 'green' ? 'healthy' : node.status === 'yellow' ? 'warning' : 'error'}`}
            >
              <div className="node-status-dot" />
              <div className="node-icon">{node.gateway ? '🏠' : '📡'}</div>
              <div className="node-info">
                <span className="node-location">{node.location || `Node ${i + 1}`}</span>
                <span className="node-model">{node.model || 'eero'}</span>
                {node.ip_address && <span className="node-ip">{node.ip_address}</span>}
              </div>
              <div className="node-stats">
                {node.connected_clients_count != null && (
                  <div className="node-stat">
                    <span className="stat-value">{node.connected_clients_count}</span>
                    <span className="stat-label">clients</span>
                  </div>
                )}
                {node.mesh_quality_bars != null && (
                  <div className="node-stat">
                    <div className="mesh-bars">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <div
                          key={bar}
                          className={`mesh-bar ${bar <= node.mesh_quality_bars! ? 'active' : ''}`}
                        />
                      ))}
                    </div>
                    <span className="stat-label">mesh</span>
                  </div>
                )}
              </div>
              <button
                className="btn-action reboot-btn"
                title="Reboot node"
                disabled={rebooting === eeroId}
                onClick={() => setConfirmReboot(eeroId)}
              >
                🔄
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
