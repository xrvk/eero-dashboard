import { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import { ArrowDown, ArrowUp, Home, Radio, Info } from 'lucide-react';
import * as api from '../api';
import SpeedHistory from './SpeedHistory';
import type { SignalFilter } from '../features/app/types';

interface ActivityViewProps {
  networkId: string;
  onNodeClick?: (eeroId: string, node: api.EeroNode) => void;
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

export default function ActivityView({ networkId, onNodeClick, onSignalClick }: ActivityViewProps) {
  const { data: devData, loading: devLoading } = useFetch(
    () => api.getDevices(networkId),
    [networkId]
  );
  const { data: network } = useFetch(() => api.getNetwork(networkId), [networkId]);
  const { data: eeroData, refetch: refetchEeros } = useFetch(
    () => api.getEeros(networkId),
    [networkId]
  );

  const [speedRunning, setSpeedRunning] = useState(false);
  const [speedSuccess, setSpeedSuccess] = useState(false);
  const [speedError, setSpeedError] = useState('');
  const [speedRefreshKey, setSpeedRefreshKey] = useState(0);
  const [rebooting, setRebooting] = useState<string | null>(null);
  const [confirmReboot, setConfirmReboot] = useState<string | null>(null);

  const handleReboot = async (eeroId: string) => {
    setRebooting(eeroId);
    try {
      await api.rebootEero(networkId, eeroId);
      setConfirmReboot(null);
      setTimeout(refetchEeros, 3000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Reboot failed');
    } finally {
      setRebooting(null);
    }
  };

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

  // Signal quality distribution
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

  if (devLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;

  return (
    <div className="activity-view">
      {/* Speed test card */}
      <div className="activity-panel full-width">
        <h3>Internet Speed</h3>
        {lastSpeed && lastSpeed.down && (
          <div className="speed-result">
            <div className="speed-stat">
              <span className="speed-dir"><ArrowDown size={16} /></span>
              <span className="speed-value">{(lastSpeed.down as { value: number }).value.toFixed(0)}</span>
              <span className="speed-unit">{(lastSpeed.down as { units: string }).units}</span>
            </div>
            {lastSpeed.up && (
              <div className="speed-stat">
                <span className="speed-dir"><ArrowUp size={16} /></span>
                <span className="speed-value">{(lastSpeed.up as { value: number }).value.toFixed(0)}</span>
                <span className="speed-unit">{(lastSpeed.up as { units: string }).units}</span>
              </div>
            )}
          </div>
        )}
        <button className="btn-primary" onClick={handleSpeedTest} disabled={speedRunning}>
          {speedRunning ? <><div className="spinner" /> Running (~30s)…</> : 'Run Speed Test'}
        </button>
        {speedSuccess && <div className="speed-success">Speed test complete</div>}
        {speedError && <div className="error-banner">{speedError}</div>}
        <SpeedHistory networkId={networkId} refreshKey={speedRefreshKey} />
      </div>

      {/* Summary row */}
      <div className="activity-summary" style={{ marginTop: 16 }}>
        {/* Band distribution */}
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

        {/* Signal quality */}
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

      {/* eero Nodes */}
      <div className="activity-panel full-width" style={{ marginTop: 16 }}>
        <h3>eero Nodes</h3>
        {confirmReboot && (
          <div className="confirm-overlay" onClick={() => setConfirmReboot(null)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <p>Reboot this node? It will be offline for ~1 minute.</p>
              <div className="confirm-actions">
                <button className="btn-confirm btn-danger" onClick={() => handleReboot(confirmReboot)}>
                  {rebooting ? 'Rebooting…' : 'Reboot'}
                </button>
                <button className="btn-cancel" onClick={() => setConfirmReboot(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <div className="node-grid">
          {(eeroData?.eeros ?? []).map((node: api.EeroNode, i: number) => {
            const eeroId = extractId(node.url);
            return (
              <div
                key={node.serial || i}
                className={`node-card ${node.status === 'green' ? 'healthy' : node.status === 'yellow' ? 'warning' : 'error'}`}
                onClick={() => onNodeClick?.(eeroId, node)}
                onMouseEnter={() => eeroId && api.prefetchEero(networkId, eeroId)}
                style={{ cursor: onNodeClick ? 'pointer' : undefined }}
              >
                <div className="node-status-dot" />
                <div className="node-icon">{node.gateway ? <Home size={20} /> : <Radio size={20} />}</div>
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
                          <div key={bar} className={`mesh-bar ${bar <= node.mesh_quality_bars! ? 'active' : ''}`} />
                        ))}
                      </div>
                      <span className="stat-label">mesh</span>
                    </div>
                  )}
                </div>
                <button
                  className="btn-action"
                  title="Reboot node"
                  disabled={rebooting === eeroId}
                  onClick={() => setConfirmReboot(eeroId)}
                  style={{ flexShrink: 0 }}
                ><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg></button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="empty-text" style={{ marginTop: 16 }}>
        <Info size={14} /> Bandwidth history and per-device usage require eero Plus.
      </p>
    </div>
  );
}
