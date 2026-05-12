import { useFetch } from '../hooks/useFetch';
import { X } from 'lucide-react';
import * as api from '../api';
import CopyableValue from './shared/CopyableValue';

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

function formatUptime(lastReboot?: string): string {
  if (!lastReboot) return '—';
  const rebootDate = new Date(lastReboot);
  if (isNaN(rebootDate.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - rebootDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

interface NodeDrawerProps {
  networkId: string;
  node: api.EeroNode;
  onClose: () => void;
}

export default function NodeDrawer({ networkId, node, onClose }: NodeDrawerProps) {
  const eeroId = extractId(node.url);

  const { data: detail, loading } = useFetch(
    () => eeroId ? api.getEero(networkId, eeroId) : Promise.resolve(null),
    [networkId, eeroId],
    {},
    eeroId ? `/networks/${networkId}/eeros/${eeroId}` : undefined,
  );

  // Merge list data with detail data (detail has more fields)
  const n = { ...node, ...(detail || {}) } as api.EeroNode;

  const statusLabel = n.status === 'green' ? 'Online' : n.status === 'yellow' ? 'Degraded' : 'Offline';
  const statusClass = n.status === 'green' ? 'text-green' : n.status === 'yellow' ? 'text-yellow' : 'text-red';

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="node-drawer-title">
            <span className="node-drawer-icon">{n.gateway ? '🏠' : '📡'}</span>
            <div>
              <h2>{n.location || `Node`}</h2>
              <span className="node-drawer-subtitle">{n.model || 'eero'}</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="drawer-body">
          {loading && !detail && (
            <div className="node-drawer-loading">
              <div className="spinner" /> Loading details…
            </div>
          )}

          {/* Status */}
          <div className="drawer-grid">
            <div className="drawer-field">
              <label className="drawer-label">Status</label>
              <span className={`drawer-value ${statusClass}`}>● {statusLabel}</span>
            </div>
            <div className="drawer-field">
              <label className="drawer-label">Role</label>
              <span className="drawer-value">{n.gateway ? 'Gateway' : 'Extender'}</span>
            </div>
            <div className="drawer-field">
              <label className="drawer-label">Clients</label>
              <span className="drawer-value">{n.connected_clients_count ?? '—'}</span>
            </div>
            {n.mesh_quality_bars != null && !n.gateway && (
              <div className="drawer-field">
                <label className="drawer-label">Mesh Quality</label>
                <span className="drawer-value">
                  <span className="mesh-bars">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <div key={bar} className={`mesh-bar ${bar <= n.mesh_quality_bars! ? 'active' : ''}`} />
                    ))}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Identity */}
          <div className="drawer-section">
            <h3>Identity</h3>
            <div className="drawer-grid">
              <div className="drawer-field">
                <label className="drawer-label">Serial</label>
                <CopyableValue value={n.serial} />
              </div>
              <div className="drawer-field">
                <label className="drawer-label">MAC Address</label>
                <CopyableValue value={n.mac_address} />
              </div>
              <div className="drawer-field">
                <label className="drawer-label">IP Address</label>
                <CopyableValue value={n.ip_address} />
              </div>
              {n.model_number && (
                <div className="drawer-field">
                  <label className="drawer-label">Model Number</label>
                  <span className="drawer-value mono">{n.model_number}</span>
                </div>
              )}
              {n.hardware_rev && (
                <div className="drawer-field">
                  <label className="drawer-label">Hardware Rev</label>
                  <span className="drawer-value mono">{n.hardware_rev}</span>
                </div>
              )}
            </div>
          </div>

          {/* Connection */}
          <div className="drawer-section">
            <h3>Connection</h3>
            <div className="drawer-grid">
              {n.os_version && (
                <div className="drawer-field">
                  <label className="drawer-label">Firmware</label>
                  <span className="drawer-value">
                    <span className="firmware-tag">{n.os_version}</span>
                  </span>
                </div>
              )}
              <div className="drawer-field">
                <label className="drawer-label">Backhaul</label>
                <span className="drawer-value">
                  <span className={`backhaul-badge ${n.ethernet ? 'wired' : 'wireless'}`}>
                    {n.ethernet ? '🔌 Wired' : '📶 Wireless'}
                  </span>
                </span>
              </div>
              {n.update_available && (
                <div className="drawer-field drawer-field-full">
                  <span className="update-badge">⬆️ Update available</span>
                </div>
              )}
            </div>
          </div>

          {/* Uptime */}
          {(n.last_reboot) && (
            <div className="drawer-section">
              <h3>Uptime</h3>
              <div className="drawer-grid">
                <div className="drawer-field">
                  <label className="drawer-label">Uptime</label>
                  <span className="drawer-value">{formatUptime(n.last_reboot)}</span>
                </div>
                <div className="drawer-field">
                  <label className="drawer-label">Last Reboot</label>
                  <span className="drawer-value">
                    {new Date(n.last_reboot!).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
