import { useState, useMemo, useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';
import SpeedHistory from './SpeedHistory';
import type { SignalFilter } from '../features/app/types';

interface ActivityViewProps {
  networkId: string;
  onSignalClick?: (tier: SignalFilter) => void;
}

interface ConnectedDevice extends api.Device {
  connectivity?: { frequency?: number; score_bars?: number };
  source?: { display_name?: string; location?: string };
}

function freqToBand(freq?: number) {
  if (!freq) return '—';
  if (freq < 3000) return '2.4 GHz';
  if (freq < 5900) return '5 GHz';
  return '6 GHz';
}

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

function formatUptime(lastReboot?: string): string {
  if (!lastReboot) return '—';
  const d = new Date(lastReboot);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

type FeatureKey = 'wpa3' | 'ipv6' | 'band_steering' | 'sqm' | 'thread';
const FEATURES: { key: FeatureKey; label: string; field?: string }[] = [
  { key: 'wpa3', label: 'WPA3' },
  { key: 'ipv6', label: 'IPv6', field: 'ipv6_upstream' },
  { key: 'band_steering', label: 'Band Steering' },
  { key: 'sqm', label: 'SQM' },
  { key: 'thread', label: 'Thread' },
];

function getFeatureEnabled(
  network: api.Network | null,
  settings: api.NetworkSettingsSummary | null,
  key: FeatureKey,
  field?: string,
): boolean | undefined {
  const f = field ?? key;
  if (key === 'sqm') return (settings?.sqm ?? network?.sqm)?.enabled;
  const v = (settings as unknown as Record<string, unknown>)?.[f]
    ?? (network as unknown as Record<string, unknown>)?.[f];
  return typeof v === 'boolean' ? v : undefined;
}

export default function ActivityView({ networkId, onSignalClick }: ActivityViewProps) {
  const { data: devData, loading: devLoading } = useFetch(
    () => api.getDevices(networkId),
    [networkId],
    {},
    `/networks/${networkId}/devices`,
  );
  const { data: network } = useFetch(
    () => api.getNetwork(networkId),
    [networkId],
    {},
    `/networks/${networkId}`,
  );
  const { data: eeroData } = useFetch(
    () => api.getEeros(networkId),
    [networkId],
    {},
    `/networks/${networkId}/eeros`,
  );
  const { data: settings } = useFetch(
    () => api.getSettings(networkId),
    [networkId],
    {},
    `/networks/${networkId}/settings`,
  );

  const [speedRunning, setSpeedRunning] = useState(false);
  const [speedSuccess, setSpeedSuccess] = useState(false);
  const [speedError, setSpeedError] = useState('');
  const [speedRefreshKey, setSpeedRefreshKey] = useState(0);
  const [showNodeDetail, setShowNodeDetail] = useState(false);

  const handleSpeedTest = async () => {
    setSpeedRunning(true);
    setSpeedError('');
    setSpeedSuccess(false);
    try {
      await api.runSpeedTest(networkId);
      setSpeedSuccess(true);
      setSpeedRefreshKey((k) => k + 1);
      setTimeout(() => setSpeedSuccess(false), 5000);
    } catch (e) {
      setSpeedError(e instanceof Error ? e.message : 'Speed test failed');
    } finally {
      setSpeedRunning(false);
    }
  };

  const devices = (devData?.devices ?? []) as ConnectedDevice[];
  const connected = devices.filter(d => d.connected);

  const bandCounts = useMemo(() => {
    const counts = { '2.4 GHz': 0, '5 GHz': 0, '6 GHz': 0, 'Wired': 0 };
    for (const d of connected) {
      if (!d.wireless) { counts['Wired']++; continue; }
      const band = freqToBand(d.connectivity?.frequency);
      if (band in counts) counts[band as keyof typeof counts]++;
    }
    return counts;
  }, [connected]);

  const signalDist = useMemo(() => {
    const buckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
    for (const d of connected) {
      if (!d.wireless || !d.connectivity?.score_bars) continue;
      const bars = d.connectivity.score_bars;
      if (bars >= 5) buckets.excellent++;
      else if (bars >= 4) buckets.good++;
      else if (bars >= 3) buckets.fair++;
      else buckets.poor++;
    }
    return buckets;
  }, [connected]);

  const lastSpeed = (network as api.Network)?.speed;

  // Network overview data
  const net = network as api.Network | null;
  const isOnline = ['up', 'green', 'connected'].includes(
    (settings?.status ?? net?.status ?? '') as string,
  );
  const networkName = settings?.name ?? net?.name ?? 'Network';
  const wanIp = settings?.wan_ip ?? net?.wan_ip;
  const enabledFeatures = FEATURES.filter(
    (f) => getFeatureEnabled(net, settings, f.key, f.field) === true,
  );

  if (devLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;

  return (
    <div className="activity-view">
      {/* Speed test card */}
      <div className="activity-panel full-width">
        <h3>Internet Speed</h3>
        {lastSpeed && lastSpeed.down && (
          <div className="speed-result">
            <div className="speed-stat">
              <span className="speed-dir">↓</span>
              <span className="speed-value">{(lastSpeed.down as { value: number }).value.toFixed(0)}</span>
              <span className="speed-unit">{(lastSpeed.down as { units: string }).units}</span>
            </div>
            {lastSpeed.up && (
              <div className="speed-stat">
                <span className="speed-dir">↑</span>
                <span className="speed-value">{(lastSpeed.up as { value: number }).value.toFixed(0)}</span>
                <span className="speed-unit">{(lastSpeed.up as { units: string }).units}</span>
              </div>
            )}
          </div>
        )}
        <button className="btn-primary" onClick={handleSpeedTest} disabled={speedRunning}>
          {speedRunning ? <><div className="spinner" /> Running (~30s)…</> : '🚀 Run Speed Test'}
        </button>
        {speedSuccess && <div className="speed-success">✅ Speed test complete</div>}
        {speedError && <div className="error-banner">{speedError}</div>}
        <SpeedHistory networkId={networkId} refreshKey={speedRefreshKey} />
      </div>

      {/* Summary row */}
      <div className="activity-summary" style={{ marginTop: 16 }}>
        <div className="activity-panel">
          <h3>Clients by Band</h3>
          <div className="band-bars">
            {Object.entries(bandCounts).filter(([, c]) => c > 0).map(([band, count]) => (
              <div key={band} className="band-row">
                <span className="band-label">{band}</span>
                <div className="band-bar-track">
                  <div
                    className={`band-bar-fill band-${band.replace(/[\s.]/g, '')}`}
                    style={{ width: `${Math.max(5, (count / (connected.length || 1)) * 100)}%` }}
                  />
                </div>
                <span className="band-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="activity-panel">
          <h3>Signal Quality</h3>
          <div className="band-bars">
            {[
              { label: '●●●●● Excellent', tier: 'excellent' as SignalFilter, count: signalDist.excellent, cls: 'band-6GHz' },
              { label: '●●●●○ Good', tier: 'good' as SignalFilter, count: signalDist.good, cls: 'band-5GHz' },
              { label: '●●●○○ Fair', tier: 'fair' as SignalFilter, count: signalDist.fair, cls: 'band-24GHz' },
              { label: '●●○○○ Poor', tier: 'poor' as SignalFilter, count: signalDist.poor, cls: 'band-poor' },
            ].filter(r => r.count > 0).map((row) => (
              <div
                key={row.label}
                className={`band-row ${onSignalClick ? 'clickable' : ''}`}
                onClick={() => onSignalClick?.(row.tier)}
                title={onSignalClick ? `View ${row.tier} signal devices` : undefined}
              >
                <span className="band-label">{row.label}</span>
                <div className="band-bar-track">
                  <div className={`band-bar-fill ${row.cls}`} style={{ width: `${Math.max(5, (row.count / (connected.length || 1)) * 100)}%` }} />
                </div>
                <span className="band-count">{row.count}</span>
                {onSignalClick && <span className="band-link-arrow">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Network & Nodes — consolidated section */}
      <div className="activity-panel full-width" style={{ marginTop: 16 }}>
        {/* Network status bar */}
        <div className="net-bar">
          <div className="net-bar-left">
            <span className={`net-bar-beacon ${isOnline ? 'online' : 'offline'}`}>
              <span className="net-bar-beacon-core" />
            </span>
            <div className="net-bar-name-group">
              <span className="net-bar-name">{networkName}</span>
              <span className="net-bar-status-text">{isOnline ? 'All systems operational' : 'Network unreachable'}</span>
            </div>
          </div>
          <div className="net-bar-right">
            {enabledFeatures.length > 0 && (
              <div className="net-bar-features">
                {enabledFeatures.map((f) => (
                  <span key={f.key} className="net-bar-tag">{f.label}</span>
                ))}
              </div>
            )}
            <div className="net-bar-stats">
              <div className="net-bar-stat">
                <span className="net-bar-stat-val">{connected.length}<span className="net-bar-stat-dim">/{devices.length}</span></span>
                <span className="net-bar-stat-lbl">devices</span>
              </div>
              {wanIp && (
                <div className="net-bar-stat">
                  <span className="net-bar-stat-val mono">{wanIp}</span>
                  <span className="net-bar-stat-lbl">wan ip</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Node cards */}
        <div className="eero-cards">
          {(eeroData?.eeros ?? []).map((node: api.EeroNode, i: number) => (
            <EeroNodeCard
              key={node.serial || i}
              networkId={networkId}
              node={node}
              index={i}
              showDetail={showNodeDetail}
            />
          ))}
        </div>
        <button
          className="eero-detail-toggle"
          onClick={() => setShowNodeDetail((v) => !v)}
        >
          {showNodeDetail ? 'Hide details' : 'Show details'}
        </button>
      </div>

      <p className="empty-text" style={{ marginTop: 16 }}>
        ℹ️ Bandwidth history and per-device usage require eero Plus.
      </p>
    </div>
  );
}

/* ── Full Inline Node Card ──────────────────── */

function CopyVal({ value }: { value: string | undefined }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);
  if (!value) return <span className="enode-f-val mono">—</span>;
  return (
    <span className={`enode-f-val mono copyable${copied ? ' copied' : ''}`} onClick={handleCopy} title="Click to copy">
      {copied ? '✓ Copied' : value}
    </span>
  );
}

interface EeroNodeCardProps {
  networkId: string;
  node: api.EeroNode;
  index: number;
  showDetail: boolean;
}

function EeroNodeCard({ networkId, node, index, showDetail }: EeroNodeCardProps) {
  const eeroId = extractId(node.url);

  const { data: detail } = useFetch(
    () => (eeroId ? api.getEero(networkId, eeroId) : Promise.resolve(null)),
    [networkId, eeroId],
    {},
    eeroId ? `/networks/${networkId}/eeros/${eeroId}` : undefined,
  );

  const n = { ...node, ...(detail || {}) } as api.EeroNode;
  const isUp = ['green', 'connected'].includes(n.status ?? '');
  const uptime = formatUptime(n.last_reboot);
  const isWired = n.wired === true || n.ethernet === true || n.connection_type === 'WIRED';
  const backhaulKnown = n.wired != null || n.ethernet != null || n.connection_type != null;

  // Primary fields — always visible (fixed 4 columns)
  const primary: { label: string; value: string; copy?: boolean }[] = [];
  if (n.connected_clients_count != null) primary.push({ label: 'Clients', value: String(n.connected_clients_count) });
  if (uptime !== '—') primary.push({ label: 'Uptime', value: uptime });
  if (n.ip_address) primary.push({ label: 'IP', value: n.ip_address, copy: true });
  if (n.os_version) primary.push({ label: 'Firmware', value: n.os_version });

  // Secondary fields — shown when showDetail is true (fixed 4 columns)
  const secondary: { label: string; value: string; copy?: boolean }[] = [];
  if (n.mac_address) secondary.push({ label: 'MAC', value: n.mac_address, copy: true });
  if (n.serial) secondary.push({ label: 'Serial', value: n.serial, copy: true });
  if (n.model_number) secondary.push({ label: 'Model', value: n.model_number });
  if (n.last_reboot) secondary.push({
    label: 'Rebooted',
    value: new Date(n.last_reboot).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  });

  return (
    <div className={`enode ${isUp ? 'enode--up' : 'enode--down'}`}>
      <div className="enode-top">
        <span className={`enode-dot ${isUp ? 'up' : 'down'}`} />
        <div className="enode-id">
          <span className="enode-name">{n.location || `Node ${index + 1}`}</span>
          <span className="enode-sub">
            {n.model || 'eero'}
            {n.gateway ? ' · Gateway' : ''}
            {backhaulKnown ? (isWired ? ' · Wired' : ' · Wireless') : ''}
          </span>
        </div>
        {n.update_available && <span className="enode-update">UPDATE</span>}
      </div>
      <div className="enode-fields">
        <div className="enode-row">
          {primary.map((f) => (
            <div key={f.label} className="enode-f">
              <span className="enode-f-lbl">{f.label}</span>
              {f.copy ? <CopyVal value={f.value} /> : <span className="enode-f-val">{f.value}</span>}
            </div>
          ))}
          {n.mesh_quality_bars != null && !n.gateway && (
            <div className="enode-f">
              <span className="enode-f-lbl">Mesh</span>
              <div className="mesh-bars" style={{ marginTop: 2 }}>
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div key={bar} className={`mesh-bar ${bar <= n.mesh_quality_bars! ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          )}
        </div>
        {showDetail && secondary.length > 0 && (
          <div className="enode-row enode-row--secondary">
            {secondary.map((f) => (
              <div key={f.label} className="enode-f">
                <span className="enode-f-lbl">{f.label}</span>
                {f.copy ? <CopyVal value={f.value} /> : <span className="enode-f-val">{f.value}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
