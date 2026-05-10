import { useState, useMemo, useRef, useEffect } from 'react';
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

function rawBytes(bytes?: number) {
  return bytes ?? 0;
}

type ViewMode = 'grid' | 'list';
type GroupBy = 'connection' | 'node' | 'none';
type StatusFilter = 'all' | 'online' | 'offline';
type SortCol = 'name' | 'ip' | 'mac' | 'type' | 'signal' | 'band' | 'speed' | 'down' | 'up';
type SortDir = 'asc' | 'desc';

interface DeviceConnectivity {
  signal?: string;
  score?: number;
  score_bars?: number;
  frequency?: number;
  rx_rate_info?: { rate_bps?: number; channel_width?: string; phy_type?: string };
}

function getConn(d: api.Device): DeviceConnectivity | undefined {
  return (d as Record<string, unknown>).connectivity as DeviceConnectivity | undefined;
}

function freqToBand(freq?: number): string {
  if (!freq) return '—';
  if (freq < 3000) return '2.4 GHz';
  if (freq < 5900) return '5 GHz';
  return '6 GHz';
}

function formatRate(bps?: number): string {
  if (!bps) return '—';
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  return `${(bps / 1_000).toFixed(0)} Kbps`;
}

function sortDevices(devices: api.Device[], col: SortCol, dir: SortDir): api.Device[] {
  const sorted = [...devices].sort((a, b) => {
    let va: string | number = '';
    let vb: string | number = '';
    switch (col) {
      case 'name':
        va = (a.display_name || a.hostname || '').toLowerCase();
        vb = (b.display_name || b.hostname || '').toLowerCase();
        break;
      case 'ip':
        va = (a.ip || '').split('.').map(n => n.padStart(3, '0')).join('.');
        vb = (b.ip || '').split('.').map(n => n.padStart(3, '0')).join('.');
        break;
      case 'mac':
        va = (a.mac || '').toLowerCase();
        vb = (b.mac || '').toLowerCase();
        break;
      case 'type':
        va = a.connection_type || '';
        vb = b.connection_type || '';
        break;
      case 'signal':
        va = getConn(a)?.score ?? -1;
        vb = getConn(b)?.score ?? -1;
        break;
      case 'band':
        va = getConn(a)?.frequency ?? 0;
        vb = getConn(b)?.frequency ?? 0;
        break;
      case 'speed':
        va = getConn(a)?.rx_rate_info?.rate_bps ?? 0;
        vb = getConn(b)?.rx_rate_info?.rate_bps ?? 0;
        break;
      case 'down':
        va = rawBytes(a.usage?.down);
        vb = rawBytes(b.usage?.down);
        break;
      case 'up':
        va = rawBytes(a.usage?.up);
        vb = rawBytes(b.usage?.up);
        break;
    }
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

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
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('online');
  const [sortCol, setSortCol] = useState<SortCol>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sortIndicator = (col: SortCol) => {
    if (sortCol !== col) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

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

  const filtered = useMemo(() => {
    let result = allDevices;
    // Status filter
    if (statusFilter === 'online') result = result.filter(d => d.connected);
    else if (statusFilter === 'offline') result = result.filter(d => !d.connected);
    // Search filter
    if (!search.trim()) return result;
    const q = search.toLowerCase().trim();
    return result.filter((d) => {
      const name = (d.display_name || d.hostname || '').toLowerCase();
      const ip = (d.ip || '').toLowerCase();
      const mac = (d.mac || '').toLowerCase();
      const manufacturer = (d.manufacturer || '').toLowerCase();
      return name.includes(q) || ip.includes(q) || mac.includes(q) || manufacturer.includes(q);
    });
  }, [allDevices, search, statusFilter]);

  const groups = useMemo(() => {
    const result: { label: string; devices: api.Device[] }[] = [];

    const makeGroup = (label: string, devs: api.Device[]) => {
      if (devs.length) result.push({ label, devices: sortDevices(devs, sortCol, sortDir) });
    };

    if (groupBy === 'none') {
      makeGroup(`All (${filtered.length})`, filtered);
    } else if (groupBy === 'connection') {
      const wired = filtered.filter(d => d.connection_type === 'wired');
      const wireless = filtered.filter(d => d.connection_type === 'wireless');
      const other = filtered.filter(d => d.connection_type !== 'wired' && d.connection_type !== 'wireless');
      makeGroup(`🔌 Wired (${wired.length})`, wired);
      makeGroup(`📶 Wireless (${wireless.length})`, wireless);
      makeGroup(`Other (${other.length})`, other);
    } else if (groupBy === 'node') {
      const byNode = new Map<string, api.Device[]>();
      for (const d of filtered) {
        const src = (d as Record<string, unknown>).source as Record<string, unknown> | undefined;
        const nodeName = (src?.display_name as string) || (src?.location as string) || 'Unknown Node';
        if (!byNode.has(nodeName)) byNode.set(nodeName, []);
        byNode.get(nodeName)!.push(d);
      }
      for (const [name, devs] of byNode) {
        makeGroup(`📡 ${name} (${devs.length})`, devs);
      }
    }

    return result;
  }, [filtered, groupBy, sortCol, sortDir]);

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
          <div className="status-toggle">
            <button className={`status-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
              All <span className="status-count">{allDevices.length}</span>
            </button>
            <button className={`status-btn online ${statusFilter === 'online' ? 'active' : ''}`} onClick={() => setStatusFilter('online')}>
              Online <span className="status-count">{allDevices.filter(d => d.connected).length}</span>
            </button>
            <button className={`status-btn offline ${statusFilter === 'offline' ? 'active' : ''}`} onClick={() => setStatusFilter('offline')}>
              Offline <span className="status-count">{allDevices.filter(d => !d.connected).length}</span>
            </button>
          </div>
          <div className="group-select">
            <label>Group:</label>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
              <option value="none">None</option>
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
                  networkId={networkId}
                  actionLoading={actionLoading}
                  onAction={(mac, type) => setConfirmAction({ mac, type })}
                />
              ))}
            </div>
          ) : (
            <table className="device-table">
              <thead>
                <tr>
                  <th></th>
                  <th className="sortable-th" onClick={() => handleSort('name')}>Name{sortIndicator('name')}</th>
                  <th className="sortable-th" onClick={() => handleSort('ip')}>IP{sortIndicator('ip')}</th>
                  <th className="sortable-th" onClick={() => handleSort('mac')}>MAC{sortIndicator('mac')}</th>
                  <th className="sortable-th" onClick={() => handleSort('type')}>Type{sortIndicator('type')}</th>
                  <th className="sortable-th" onClick={() => handleSort('signal')}>Signal{sortIndicator('signal')}</th>
                  <th className="sortable-th" onClick={() => handleSort('band')}>Band{sortIndicator('band')}</th>
                  <th className="sortable-th" onClick={() => handleSort('speed')}>Speed{sortIndicator('speed')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.devices.map((d) => {
                  const conn = getConn(d);
                  const bars = conn?.score_bars ?? 0;
                  return (
                  <tr key={d.mac || extractId(d.url)} className={d.connected ? '' : 'row-offline'}>
                    <td className="td-icon">{getDeviceIcon(d)}</td>
                    <td className="td-name">{d.display_name || d.hostname || 'Unknown'}</td>
                    <td className="td-mono">{d.ip || '—'}</td>
                    <td className="td-mono">{d.mac || '—'}</td>
                    <td>{d.wireless ? '📶' : '🔌'} {d.connection_type || '—'}</td>
                    <td>
                      {d.wireless && conn ? (
                        <>
                          <span className="signal-bars">
                            {[1,2,3,4,5].map(b => (
                              <span key={b} className={`sig-bar ${b <= bars ? 'active' : ''}`} />
                            ))}
                          </span>
                          <span className="td-mono" style={{ marginLeft: 4 }}>{conn.signal || ''}</span>
                        </>
                      ) : d.wireless ? '—' : ''}
                    </td>
                    <td>
                      {d.wireless && conn?.frequency ? (
                        <span className={`band-pill band-${freqToBand(conn.frequency).replace(/[\s.]/g, '')}`}>
                          {freqToBand(conn.frequency)}
                        </span>
                      ) : d.wireless ? '—' : ''}
                    </td>
                    <td className="td-mono">
                      {conn?.rx_rate_info?.rate_bps ? formatRate(conn.rx_rate_info.rate_bps) : d.wireless ? '—' : ''}
                    </td>
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
                  );
                })}
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

function DeviceCard({ device: d, networkId, actionLoading, onAction }: {
  device: api.Device;
  networkId: string;
  actionLoading: string | null;
  onAction: (mac: string, type: 'pause' | 'block') => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const conn = getConn(d);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className={`device-card ${d.connected ? 'connected' : 'offline'}`}>
      <div className="device-icon">{getDeviceIcon(d)}</div>
      <div className="device-info">
        <span className="device-name">{d.display_name || d.hostname || 'Unknown'}</span>
        <span className="device-meta">{d.ip || d.mac}</span>
        {d.connection_type && (
          <span className="device-connection">
            {d.wireless ? '📶' : '🔌'} {d.connection_type}
            {d.wireless && conn?.frequency ? ` · ${freqToBand(conn.frequency)}` : ''}
          </span>
        )}
      </div>
      <div className="card-right">
        {d.wireless && conn && d.connected && (
          <div className="device-signal">
            <span className="signal-bars">
              {[1,2,3,4,5].map(b => (
                <span key={b} className={`sig-bar ${b <= (conn.score_bars ?? 0) ? 'active' : ''}`} />
              ))}
            </span>
          </div>
        )}
        {d.connected && (
          <div className="card-menu-wrapper" ref={menuRef}>
            <button
              className="btn-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Actions"
            >⋯</button>
            {menuOpen && (
              <div className="card-menu">
                <button
                  className="card-menu-item"
                  disabled={actionLoading === d.mac}
                  onClick={() => { setMenuOpen(false); onAction(d.mac!, 'pause'); }}
                >
                  ⏸️ Pause Internet
                </button>
                <button
                  className="card-menu-item danger"
                  disabled={actionLoading === d.mac}
                  onClick={() => { setMenuOpen(false); onAction(d.mac!, 'block'); }}
                >
                  🚫 Block Device
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
