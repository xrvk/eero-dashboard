import { useState, useMemo, useRef, useEffect } from 'react';
import { useFetch } from '../hooks/useFetch';
import type { Device } from '../api';
import { devicesClient } from '../features/devices/client';
import DeviceDrawer from './DeviceDrawer';

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

function rawBytes(bytes?: number) {
  return bytes ?? 0;
}

type ViewMode = 'grid' | 'list';
type GroupBy = 'none' | 'node';
type StatusFilter = 'all' | 'online' | 'offline';
type BandFilter = 'all' | 'wired' | 'wireless';
type SortCol = 'name' | 'ip' | 'mac' | 'type' | 'signal' | 'band' | 'speed' | 'down' | 'up';
type SortDir = 'asc' | 'desc';

interface DeviceConnectivity {
  signal?: string;
  score?: number;
  score_bars?: number;
  frequency?: number;
  rx_rate_info?: { rate_bps?: number; channel_width?: string; phy_type?: string };
}

function getConn(d: Device): DeviceConnectivity | undefined {
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

function sortDevices(devices: Device[], col: SortCol, dir: SortDir): Device[] {
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
  onNavigate?: (tab: string) => void;
}

export default function DeviceList({ networkId, onNavigate }: DeviceListProps) {
  const { data, loading, error, refetch } = useFetch(
    () => devicesClient.list(networkId),
    [networkId],
    {},
    `/networks/${networkId}/devices`,
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ mac: string; type: 'pause' | 'block' } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ mac: string; name: string } | null>(null);
  const [renameName, setRenameName] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('online');
  const [bandFilter, setBandFilter] = useState<BandFilter>('all');
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
      if (type === 'pause') await devicesClient.pause(networkId, deviceId, value);
      else await devicesClient.block(networkId, deviceId, value);
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    setActionLoading(renameTarget.mac);
    try {
      // Empty string resets to eero default (hostname/manufacturer)
      await devicesClient.rename(networkId, renameTarget.mac, renameName.trim());
      await refetch();
      setRenameTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Rename failed');
    } finally {
      setActionLoading(null);
    }
  };

  const allDevices = useMemo(() => data?.devices ?? [], [data?.devices]);

  const filtered = useMemo(() => {
    let result = allDevices;
    // Status filter
    if (statusFilter === 'online') result = result.filter(d => d.connected);
    else if (statusFilter === 'offline') result = result.filter(d => !d.connected);
    // Band filter
    if (bandFilter !== 'all') {
      result = result.filter(d => {
        if (bandFilter === 'wired') return !d.wireless;
        if (bandFilter === 'wireless') return !!d.wireless;
        return true;
      });
    }
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
  }, [allDevices, search, statusFilter, bandFilter]);

  const groups = useMemo(() => {
    const result: { label: string; devices: Device[] }[] = [];

    const makeGroup = (label: string, devs: Device[]) => {
      if (devs.length) result.push({ label, devices: sortDevices(devs, sortCol, sortDir) });
    };

    if (groupBy === 'none') {
      if (bandFilter === 'wireless') {
        // Auto-subgroup wireless by band
        const ghz24 = filtered.filter(d => { const f = getConn(d)?.frequency; return f != null && f < 3000; });
        const ghz5 = filtered.filter(d => { const f = getConn(d)?.frequency; return f != null && f >= 3000 && f < 5900; });
        const ghz6 = filtered.filter(d => { const f = getConn(d)?.frequency; return f != null && f >= 5900; });
        const unknown = filtered.filter(d => getConn(d)?.frequency == null);
        makeGroup(`2.4 GHz (${ghz24.length})`, ghz24);
        makeGroup(`5 GHz (${ghz5.length})`, ghz5);
        makeGroup(`6 GHz (${ghz6.length})`, ghz6);
        if (unknown.length) makeGroup(`Unknown band (${unknown.length})`, unknown);
      } else {
        makeGroup('', filtered);
      }
    } else if (groupBy === 'node') {
      const byNode = new Map<string, Device[]>();
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
  }, [filtered, groupBy, bandFilter, sortCol, sortDir]);

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading devices…</div>;
  if (error) return (
    <div className="card error-card">
      <span>⚠️ Failed to load devices: {error}</span>
      <button className="btn-primary btn-sm" onClick={refetch} style={{ marginLeft: 16 }}>Retry</button>
    </div>
  );

  return (
    <div className="device-list">
      {selectedDevice && (
        <DeviceDrawer
          networkId={networkId}
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onRefresh={() => { refetch(); setSelectedDevice(null); }}
        />
      )}
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

      {renameTarget && (
        <div className="confirm-overlay" onClick={() => setRenameTarget(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p style={{ marginBottom: 12 }}>✏️ Rename device</p>
            <input
              className="rename-input"
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Leave empty to reset to default"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            />
            <div className="confirm-actions" style={{ marginTop: 16 }}>
              <button className="btn-confirm" onClick={handleRename} disabled={actionLoading === renameTarget.mac}>
                {actionLoading ? 'Saving…' : renameName.trim() ? 'Save' : 'Reset to default'}
              </button>
              <button className="btn-cancel" onClick={() => setRenameTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="device-toolbar">
        <div className="toolbar-row">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search devices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>
          <div className="toolbar-actions">
            <button
              className={`toolbar-toggle ${groupBy === 'node' ? 'active' : ''}`}
              onClick={() => setGroupBy(g => g === 'node' ? 'none' : 'node')}
              title="Group by eero node"
            >
              📡 By Node
            </button>
            <div className="view-toggle">
              <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">⊞</button>
              <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view">☰</button>
            </div>
            <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
          </div>
        </div>
        <div className="toolbar-row">
          <div className="filter-bar">
            <div className="filter-group">
              <button className={`filter-btn ${statusFilter === 'all' && bandFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('all'); setBandFilter('all'); }}>
                All <span className="filter-count">{allDevices.length}</span>
              </button>
              <span className="filter-sep" />
              <button className={`filter-btn green ${statusFilter === 'online' && bandFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('online'); setBandFilter('all'); }}>
                Online <span className="filter-count">{allDevices.filter(d => d.connected).length}</span>
              </button>
              <button className={`filter-btn ${statusFilter === 'offline' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('offline'); setBandFilter('all'); }}>
                Offline <span className="filter-count">{allDevices.filter(d => !d.connected).length}</span>
              </button>
              <span className="filter-sep" />
              <button className={`filter-btn ${bandFilter === 'wired' ? 'active' : ''}`}
                onClick={() => { setBandFilter('wired'); setStatusFilter('online'); }}>
                Wired
              </button>
              <button className={`filter-btn ${bandFilter === 'wireless' ? 'active' : ''}`}
                onClick={() => { setBandFilter('wireless'); setStatusFilter('online'); }}>
                Wireless
              </button>
            </div>
          </div>
          <span className="results-counter">
            {filtered.length} of {allDevices.length}
            {search && <> · "{search}"</>}
          </span>
        </div>
      </div>

      {/* Grouped device sections */}
      {groups.map((group) => (
        <div key={group.label} className="device-group">
          {group.label && (
            <div className="group-header">
              <h3>{group.label}</h3>
            </div>
          )}

          {viewMode === 'grid' ? (
            <div className="device-grid">
              {group.devices.map((d) => (
                <DeviceCard
                  key={d.mac || extractId(d.url)}
                  device={d}
                  actionLoading={actionLoading}
                  onAction={(mac, type) => setConfirmAction({ mac, type })}
                  onRename={(mac, name) => { setRenameTarget({ mac, name }); setRenameName(name); }}
                  onReserve={() => {
                    if (d.ip) navigator.clipboard.writeText(d.ip);
                    if (onNavigate) onNavigate('settings-reservations');
                  }}
                  onClick={() => setSelectedDevice(d)}
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
                  <th className="sortable-th" onClick={() => handleSort('type')}>Conn{sortIndicator('type')}</th>
                  <th className="sortable-th" onClick={() => handleSort('signal')}>Signal{sortIndicator('signal')}</th>
                  <th className="sortable-th" onClick={() => handleSort('speed')}>Speed{sortIndicator('speed')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.devices.map((d) => {
                  const conn = getConn(d);
                  const bars = conn?.score_bars ?? 0;
                  return (
                  <tr key={d.mac || extractId(d.url)} className={`${d.connected ? '' : 'row-offline'} clickable-row`}
                    onClick={() => setSelectedDevice(d)}>
                    <td className="td-icon">{getDeviceIcon(d)}</td>
                    <td className="td-name">{d.display_name || d.hostname || 'Unknown'}</td>
                    <td className="td-mono">{d.ip || '—'}</td>
                    <td className="td-mono">{d.mac || '—'}</td>
                    <td className="td-conn">
                      {d.wireless ? (
                        <>📶 {conn?.frequency ? freqToBand(conn.frequency) : 'Wireless'}</>
                      ) : '🔌 Wired'}
                    </td>
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
                    <td className="td-mono">
                      {conn?.rx_rate_info?.rate_bps ? formatRate(conn.rx_rate_info.rate_bps) : d.wireless ? '—' : ''}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {d.connected && (
                        <TableRowMenu
                          device={d}
                          actionLoading={actionLoading}
                          onAction={(mac, type) => setConfirmAction({ mac, type })}
                          onRename={(mac, name) => { setRenameTarget({ mac, name }); setRenameName(name); }}
                          onReserve={() => {
                            if (d.ip) navigator.clipboard.writeText(d.ip);
                            if (onNavigate) onNavigate('settings-reservations');
                          }}
                        />
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
          {search ? (
            <>
              <p className="empty-icon">🔍</p>
              <p className="empty-text">No devices match "{search}"</p>
              <p className="empty-hint">Try searching by name, IP, MAC, or manufacturer</p>
            </>
          ) : (
            <>
              <p className="empty-icon">🌐</p>
              <p className="empty-text">No {statusFilter !== 'all' ? statusFilter : ''} devices {bandFilter !== 'all' ? `(${bandFilter})` : ''}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device: d, actionLoading, onAction, onRename, onReserve, onClick }: {
  device: Device;
  actionLoading: string | null;
  onAction: (mac: string, type: 'pause' | 'block') => void;
  onRename: (mac: string, currentName: string) => void;
  onReserve: () => void;
  onClick: () => void;
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
    <div className={`device-card ${d.connected ? 'connected' : 'offline'}`} onClick={onClick} style={{ cursor: 'pointer' }}>
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
      <div className="card-right" onClick={(e) => e.stopPropagation()}>
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
                  onClick={() => { setMenuOpen(false); onRename(d.mac!, d.display_name || d.hostname || ''); }}
                >
                  ✏️ Rename
                </button>
                <button
                  className="card-menu-item"
                  onClick={() => { setMenuOpen(false); onReserve(); }}
                >
                  📌 Reserve IP
                </button>
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

function TableRowMenu({ device: d, actionLoading, onAction, onRename, onReserve }: {
  device: Device;
  actionLoading: string | null;
  onAction: (mac: string, type: 'pause' | 'block') => void;
  onRename: (mac: string, currentName: string) => void;
  onReserve: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="card-menu-wrapper" ref={ref}>
      <button className="btn-menu" onClick={() => setOpen(!open)} title="Actions">⋯</button>
      {open && (
        <div className="card-menu">
          <button className="card-menu-item" onClick={() => { setOpen(false); onRename(d.mac!, d.display_name || d.hostname || ''); }}>
            ✏️ Rename
          </button>
          <button className="card-menu-item" onClick={() => { setOpen(false); onReserve(); }}>
            📌 Reserve IP
          </button>
          <button className="card-menu-item" disabled={actionLoading === d.mac} onClick={() => { setOpen(false); onAction(d.mac!, 'pause'); }}>
            ⏸️ Pause Internet
          </button>
          <button className="card-menu-item danger" disabled={actionLoading === d.mac} onClick={() => { setOpen(false); onAction(d.mac!, 'block'); }}>
            🚫 Block Device
          </button>
        </div>
      )}
    </div>
  );
}

function getDeviceIcon(d: Device) {
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
