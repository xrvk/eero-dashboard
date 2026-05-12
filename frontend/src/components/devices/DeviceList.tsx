import { useState, useMemo } from 'react';
import type { JSX } from 'react';
import {
  Wifi, Cable, LayoutGrid, List, RefreshCw, Radio,
  ArrowUp, ArrowDown, ArrowUpDown, Search, AlertTriangle, Globe,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import type { Device } from '../../api';
import { devicesClient } from '../../features/devices/client';
import DeviceDrawer from '../DeviceDrawer';
import type { SignalFilter, BandClickFilter } from '../../features/app/types';
import DeviceCard from './DeviceCard';
import TableRowMenu from './TableRowMenu';
import { getConn, getDeviceIcon, freqToBand, formatRate } from './utils';

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

const BAND_DISPLAY_NAMES: Record<string, string> = {
  '2.4ghz': '2.4 GHz',
  '5ghz': '5 GHz',
  '6ghz': '6 GHz',
  'wired': 'Wired',
};

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

function matchesSignalTier(d: Device, tier: SignalFilter): boolean {
  if (tier === 'all') return true;
  if (!d.wireless) return false;
  const bars = getConn(d)?.score_bars;
  if (bars == null) return false;
  switch (tier) {
    case 'excellent': return bars >= 5;
    case 'good': return bars === 4;
    case 'fair': return bars === 3;
    case 'poor': return bars <= 2;
    default: return true;
  }
}

function matchesBandClick(d: Device, band: BandClickFilter): boolean {
  if (band === 'all') return true;
  if (band === 'wired') return !d.wireless;
  if (!d.wireless) return false;
  const freq = getConn(d)?.frequency;
  if (!freq) return false;
  if (band === '2.4ghz') return freq < 3000;
  if (band === '5ghz') return freq >= 3000 && freq < 5900;
  if (band === '6ghz') return freq >= 5900;
  return true;
}

interface DeviceListProps {
  networkId: string;
  onNavigate?: (tab: string) => void;
  signalFilter?: SignalFilter;
  onClearSignalFilter?: () => void;
  bandClickFilter?: BandClickFilter;
  onClearBandClickFilter?: () => void;
}

export default function DeviceList({ networkId, onNavigate, signalFilter = 'all', onClearSignalFilter, bandClickFilter = 'all', onClearBandClickFilter }: DeviceListProps) {
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

  const sortIndicator = (col: SortCol): JSX.Element => {
    if (sortCol !== col) return <>{' '}<ArrowUpDown size={12} /></>;
    return sortDir === 'asc' ? <>{' '}<ArrowUp size={12} /></> : <>{' '}<ArrowDown size={12} /></>;
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
    // Band filter (local toolbar toggle)
    if (bandFilter !== 'all') {
      result = result.filter(d => {
        if (bandFilter === 'wired') return !d.wireless;
        if (bandFilter === 'wireless') return !!d.wireless;
        return true;
      });
    }
    // Band click filter (from Health tab click-through)
    if (bandClickFilter && bandClickFilter !== 'all') {
      result = result.filter(d => matchesBandClick(d, bandClickFilter));
    }
    // Signal quality filter
    if (signalFilter && signalFilter !== 'all') {
      result = result.filter(d => matchesSignalTier(d, signalFilter));
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
  }, [allDevices, search, statusFilter, bandFilter, bandClickFilter, signalFilter]);

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
        makeGroup(`${name} (${devs.length})`, devs);
      }
    }

    return result;
  }, [filtered, groupBy, bandFilter, sortCol, sortDir]);

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading devices…</div>;
  if (error) return (
    <div className="card error-card">
      <span><AlertTriangle size={16} /> Failed to load devices: {error}</span>
      <button className="btn-primary btn-sm ml-16" onClick={refetch}>Retry</button>
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
            <p>{confirmAction.type === 'pause' ? 'Pause' : 'Block'} this device?</p>
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
            <p className="mb-12">Rename device</p>
            <input
              className="rename-input"
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              placeholder="Leave empty to reset to default"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameTarget(null); }}
            />
            <div className="confirm-actions mt-16">
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
            <span className="search-icon"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Name, IP, or MAC…"
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
              <Radio size={14} /> By Node
            </button>
            <div className="view-toggle">
              <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view"><LayoutGrid size={16} /></button>
              <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List view"><List size={16} /></button>
            </div>
            <button className="btn-icon" onClick={refetch} title="Refresh"><RefreshCw size={16} /></button>
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
        {signalFilter && signalFilter !== 'all' && (
          <div className="toolbar-row signal-filter-row">
            <span className="signal-filter-chip">
              📶 Showing {signalFilter} signal devices
              {onClearSignalFilter && (
                <button className="signal-filter-clear" onClick={onClearSignalFilter} title="Clear signal filter">×</button>
              )}
            </span>
          </div>
        )}
        {bandClickFilter && bandClickFilter !== 'all' && (
          <div className="toolbar-row band-filter-row">
            <span className="band-filter-chip">
              📡 Showing {BAND_DISPLAY_NAMES[bandClickFilter]} devices
              {onClearBandClickFilter && (
                <button className="band-filter-clear" onClick={onClearBandClickFilter} title="Clear band filter">×</button>
              )}
            </span>
          </div>
        )}
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
                        <><Wifi size={14} /> {conn?.frequency ? freqToBand(conn.frequency) : 'Wireless'}</>
                      ) : <><Cable size={14} /> Wired</>}
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
              <p className="empty-icon"><Search size={40} /></p>
              <p className="empty-text">No devices match "{search}"</p>
              <p className="empty-hint">Try searching by name, IP, MAC, or manufacturer</p>
            </>
          ) : (
            <>
              <p className="empty-icon"><Globe size={40} /></p>
              <p className="empty-text">No {statusFilter !== 'all' ? statusFilter : ''} devices {bandFilter !== 'all' ? `(${bandFilter})` : ''}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
