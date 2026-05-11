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
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

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
          const isExpanded = expandedNode === eeroId;
          return (
            <div key={node.serial || i}>
              <div
                className={`node-card ${node.status === 'green' ? 'healthy' : node.status === 'yellow' ? 'warning' : 'error'}`}
                onClick={() => setExpandedNode(isExpanded ? null : eeroId)}
                style={{ cursor: 'pointer' }}
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
                  onClick={(e) => { e.stopPropagation(); setConfirmReboot(eeroId); }}
                >
                  🔄
                </button>
              </div>
              {isExpanded && (
                <NodeControls networkId={networkId} eeroId={eeroId} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeControls({ networkId, eeroId }: { networkId: string; eeroId: string }) {
  const { data: ledData, refetch: refetchLed } = useFetch(
    () => api.getLedStatus(networkId, eeroId),
    [networkId, eeroId]
  );
  const [saving, setSaving] = useState(false);

  const led = ledData as Record<string, unknown> || {};
  const ledOn = !!led.led_on;
  const brightness = (led.brightness as number) ?? 100;

  const handleLedToggle = async () => {
    setSaving(true);
    try {
      await api.setLed(networkId, eeroId, !ledOn);
      await refetchLed();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleBrightness = async (value: number) => {
    setSaving(true);
    try {
      await api.setLedBrightness(networkId, eeroId, value);
      await refetchLed();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="node-controls">
      <div className="toggle-row">
        <div className="toggle-info">
          <span className="toggle-name">LED Light</span>
          <span className="toggle-desc">Status LED on this node</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={ledOn} disabled={saving} onChange={handleLedToggle} />
          <span className="toggle-slider" />
        </label>
      </div>
      {ledOn && (
        <div className="brightness-control">
          <label className="toggle-desc">Brightness</label>
          <div className="brightness-row">
            <input
              type="range"
              min="0"
              max="100"
              value={brightness}
              onChange={(e) => handleBrightness(Number(e.target.value))}
              disabled={saving}
              className="brightness-slider"
            />
            <span className="brightness-value">{brightness}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
