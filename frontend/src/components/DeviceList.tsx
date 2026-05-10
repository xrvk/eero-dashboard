import { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

function formatBytes(bytes?: number) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type ViewMode = 'grid' | 'list';
type GroupBy = 'status' | 'connection' | 'node';

interface DeviceListProps {
  networkId: string;
}

export default function DeviceList({ networkId }: DeviceListProps) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getDevices(networkId),
    [networkId]
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ mac: string; type: 'pause' | 'block' } | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [groupBy, setGroupBy] = useState<GroupBy>('status');

  const handleAction = async (deviceId: string, type: 'pause' | 'block', value: boolean) => {
    setActionLoading(deviceId);
    try {
      if (type === 'pause') await api.pauseDevice(networkId, deviceId, value);
      else await api.blockDevice(networkId, deviceId, value);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const allDevices = data?.devices ?? [];

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return allDevices;
    const q = search.toLowerCase().trim();
    return allDevices.filter((d) => {
      const name = (d.display_name || d.hostname || '').toLowerCase();
      const ip = (d.ip || '').toLowerCase();
      const mac = (d.mac || '').toLowerCase();
      const manufacturer = (d.manufacturer || '').toLowerCase();
      return name.includes(q) || ip.includes(q) || mac.includes(q) || manufacturer.includes(q);
    });
  }, [allDevices, search]);

  // Group devices
  const groups = useMemo(() => {
    const result: { label: string; devices: api.Device[] }[] = [];

    if (groupBy === 'status') {
      const connected = filtered.filter((d) => d.connected);
      const offline = filtered.filter((d) => !d.connected);
      if (connected.length) result.push({ label: `Connected (${connected.length})`, devices: connected });
      if (offline.length) result.push({ label: `Offline (${offline.length})`, devices: offline });
    } else if (groupBy === 'connection') {
      const wired = filtered.filter((d) => d.connection_type === 'wired');
      const wireless = filtered.filter((d) => d.connection_type === 'wireless');
      const other = filtered.filter((d) => d.connection_type !== 'wired' && d.connection_type !== 'wireless');
      if (wired.length) result.push({ label: `🔌 Wired (${wired.length})`, devices: wired });
      if (wireless.length) result.push({ label: `📶 Wireless (${wireless.length})`, devices: wireless });
      if (other.length) result.push({ label: `Other (${other.length})`, devices: other });
    } else if (groupBy === 'node') {
      const byNode = new Map<string, api.Device[]>();
      for (const d of filtered) {
        const src = (d as Record<string, unknown>).source as Record<string, unknown> | undefined;
        const nodeName = (src?.display_name as string) || (src?.location as string) || 'Unknown Node';
        if (!byNode.has(nodeName)) byNode.set(nodeName, []);
        byNode.get(nodeName)!.push(d);
      }
      for (const [name, devs] of byNode) {
        result.push({ label: `📡 ${name} (${devs.length})`, devices: devs });
      }
    }

    return result;
  }, [filtered, groupBy]);

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading devices…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  return (
    <div className="device-list">
      {confirmAction && (
        <div className="confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>{confirmAction.type === 'pause' ? '⏸️ Pause' : '🚫 Block'} this device?</p>
            <div className="confirm-actions">
              <button className="btn-confirm" onClick={() => handleAction(confirmAction.mac, confirmAction.type, true)}>
                {actionLoading ? 'Working…' : 'Confirm'}
              </button>
              <button className="btn-cancel" onClick={() => setConfirmAction(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="device-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, IP, MAC, or manufacturer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>
        <div className="toolbar-controls">
          <div className="group-select">
            <label>Group:</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
              <option value="status">Online / Offline</option>
              <option value="connection">Connection Type</option>
              <option value="node">eero Node</option>
            </select>
          </div>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >⊞</button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >☰</button>
          </div>
          <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
        </div>
      </div>

      {search && (
        <div className="search-results-info">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
        </div>
      )}

      {/* Grouped device sections */}
      {groups.map((group) => (
        <div key={group.label} className="device-group">
          <div className="group-header">
            <h3>{group.label}</h3>
          </div>

          {viewMode === 'grid' ? (
            <div className="device-grid">
              {group.devices.map((d) => (
                <DeviceCard
                  key={d.mac || extractId(d.url)}
                  device={d}
                  actionLoading={actionLoading}
                  onPause={() => setConfirmAction({ mac: d.mac!, type: 'pause' })}
                  onBlock={() => setConfirmAction({ mac: d.mac!, type: 'block' })}
                />
              ))}
            </div>
          ) : (
            <table className="device-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Type</th>
                  <th>Usage ↓</th>
                  <th>Usage ↑</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.devices.map((d) => (
                  <tr key={d.mac || extractId(d.url)} className={d.connected ? '' : 'row-offline'}>
                    <td className="td-icon">{getDeviceIcon(d)}</td>
                    <td className="td-name">{d.display_name || d.hostname || 'Unknown'}</td>
                    <td className="td-mono">{d.ip || '—'}</td>
                    <td className="td-mono">{d.mac || '—'}</td>
                    <td>{d.wireless ? '📶' : '🔌'} {d.connection_type || '—'}</td>
                    <td className="td-mono">{formatBytes(d.usage?.down)}</td>
                    <td className="td-mono">{formatBytes(d.usage?.up)}</td>
                    <td>
                      {d.connected && (
                        <div className="device-actions">
                          <button className="btn-action" title="Pause" disabled={actionLoading === d.mac}
                            onClick={() => setConfirmAction({ mac: d.mac!, type: 'pause' })}>⏸️</button>
                          <button className="btn-action" title="Block" disabled={actionLoading === d.mac}
                            onClick={() => setConfirmAction({ mac: d.mac!, type: 'block' })}>🚫</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="empty-state">
          <p className="empty-text">No devices match your search</p>
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device: d, actionLoading, onPause, onBlock }: {
  device: api.Device;
  actionLoading: string | null;
  onPause: () => void;
  onBlock: () => void;
}) {
  return (
    <div className={`device-card ${d.connected ? 'connected' : 'offline'}`}>
      <div className="device-icon">{getDeviceIcon(d)}</div>
      <div className="device-info">
        <span className="device-name">{d.display_name || d.hostname || 'Unknown'}</span>
        <span className="device-meta">{d.ip || d.mac}</span>
        {d.connection_type && (
          <span className="device-connection">
            {d.wireless ? '📶' : '🔌'} {d.connection_type}
          </span>
        )}
      </div>
      <div className="device-usage">
        {d.usage && (
          <>
            <span className="usage-down">↓ {formatBytes(d.usage.down)}</span>
            <span className="usage-up">↑ {formatBytes(d.usage.up)}</span>
          </>
        )}
      </div>
      {d.connected && (
        <div className="device-actions">
          <button className="btn-action" title="Pause internet" disabled={actionLoading === d.mac} onClick={onPause}>⏸️</button>
          <button className="btn-action" title="Block device" disabled={actionLoading === d.mac} onClick={onBlock}>🚫</button>
        </div>
      )}
    </div>
  );
}

function getDeviceIcon(d: api.Device) {
  const name = (d.display_name || d.hostname || '').toLowerCase();
  const type = (d.device_type || '').toLowerCase();
  if (type.includes('phone') || name.includes('iphone') || name.includes('pixel') || name.includes('galaxy')) return '📱';
  if (type.includes('tablet') || name.includes('ipad')) return '📱';
  if (type.includes('laptop') || name.includes('macbook') || name.includes('laptop')) return '💻';
  if (type.includes('desktop') || name.includes('imac') || name.includes('mac-pro')) return '🖥️';
  if (type.includes('tv') || name.includes('apple-tv') || name.includes('roku') || name.includes('fire')) return '📺';
  if (type.includes('speaker') || name.includes('echo') || name.includes('homepod') || name.includes('sonos')) return '🔊';
  if (type.includes('camera') || name.includes('cam')) return '📷';
  if (type.includes('printer')) return '🖨️';
  if (name.includes('switch') || name.includes('playstation') || name.includes('xbox') || name.includes('nintendo')) return '🎮';
  return '🌐';
}
