import { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface ActivityViewProps {
  networkId: string;
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

export default function ActivityView({ networkId }: ActivityViewProps) {
  const { data: devData, loading: devLoading, refetch } = useFetch(
    () => api.getDevices(networkId),
    [networkId]
  );
  const { data: network } = useFetch(() => api.getNetwork(networkId), [networkId]);
  const { data: eeroData, refetch: refetchEeros } = useFetch(
    () => api.getEeros(networkId),
    [networkId]
  );

  const [speedRunning, setSpeedRunning] = useState(false);
  const [speedResult, setSpeedResult] = useState<Record<string, unknown> | null>(null);
  const [speedError, setSpeedError] = useState('');
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
    setSpeedResult(null);
    try {
      const resp = await api.runSpeedTest(networkId);
      setSpeedResult(resp);
      refetchHistory();
    } catch (e) {
      setSpeedError(e instanceof Error ? e.message : 'Speed test failed');
    } finally {
      setSpeedRunning(false);
    }
  };

  // Speed test history
  const { data: historyData, refetch: refetchHistory } = useFetch(
    () => api.getSpeedHistory(networkId),
    [networkId]
  );
  const speedHistory = historyData?.history ?? [];

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

  const nodeCounts = useMemo(() => {
    const counts = new Map<string, { total: number; wireless: number }>();
    for (const d of connected) {
      const node = d.source?.display_name || d.source?.location || 'Unknown';
      const prev = counts.get(node) || { total: 0, wireless: 0 };
      prev.total++;
      if (d.wireless) prev.wireless++;
      counts.set(node, prev);
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
        {speedResult && <pre className="json-preview">{JSON.stringify(speedResult, null, 2)}</pre>}
        {speedError && <div className="error-banner">{speedError}</div>}
        {speedHistory.length > 1 && <SpeedChart history={speedHistory} />}
        {speedHistory.length === 1 && (
          <p className="empty-text" style={{ marginTop: 12 }}>Run more speed tests to see trends</p>
        )}
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
              { label: '●●●●● Excellent', count: signalDist.excellent, cls: 'band-6GHz' },
              { label: '●●●●○ Good', count: signalDist.good, cls: 'band-5GHz' },
              { label: '●●●○○ Fair', count: signalDist.fair, cls: 'band-24GHz' },
              { label: '●●○○○ Poor', count: signalDist.poor, cls: 'band-poor' },
            ].filter(r => r.count > 0).map((row) => (
              <div key={row.label} className="band-row">
                <span className="band-label">{row.label}</span>
                <div className="band-bar-track">
                  <div className={`band-bar-fill ${row.cls}`} style={{ width: `${Math.max(5, (row.count / (connected.length || 1)) * 100)}%` }} />
                </div>
                <span className="band-count">{row.count}</span>
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
        <div className="node-grid">
          {(eeroData?.eeros ?? []).map((node: api.EeroNode, i: number) => {
            const eeroId = extractId(node.url);
            const nodeClients = nodeCounts.get(
              (node as unknown as ConnectedDevice).location || node.location || ''
            );
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
                >🔄</button>
              </div>
            );
          })}
        </div>
      </div>

      <p className="empty-text" style={{ marginTop: 16 }}>
        ℹ️ Bandwidth history and per-device usage require eero Plus.
      </p>
    </div>
  );
}

function SpeedChart({ history }: { history: api.SpeedHistoryEntry[] }) {
  const W = 600, H = 160, PAD = 40;
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const downs = sorted.map(h => h.down ?? 0);
  const ups = sorted.map(h => h.up ?? 0);
  const allVals = [...downs, ...ups];
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals);

  const x = (i: number) => PAD + (i / Math.max(sorted.length - 1, 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - minVal) / (maxVal - minVal || 1)) * (H - PAD * 2);

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  // Show ~5 date labels
  const labelStep = Math.max(1, Math.floor(sorted.length / 5));

  return (
    <div className="speed-chart" style={{ marginTop: 16 }}>
      <div className="speed-chart-header">
        <h4>Speed History</h4>
        <div className="speed-chart-legend">
          <span className="legend-item"><span className="legend-color" style={{ background: 'var(--accent)' }} /> Download</span>
          <span className="legend-item"><span className="legend-color" style={{ background: 'var(--green)' }} /> Upload</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="speed-chart-svg">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const val = minVal + f * (maxVal - minVal);
          const yPos = y(val);
          return (
            <g key={f}>
              <line x1={PAD} x2={W - PAD} y1={yPos} y2={yPos} stroke="var(--border)" strokeWidth="0.5" />
              <text x={PAD - 4} y={yPos + 3} textAnchor="end" fill="var(--text-dim)" fontSize="9">
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}
        {/* Date labels */}
        {sorted.map((h, i) => i % labelStep === 0 || i === sorted.length - 1 ? (
          <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fill="var(--text-dim)" fontSize="9">
            {formatDate(h.date)}
          </text>
        ) : null)}
        {/* Lines */}
        <path d={toPath(downs)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        <path d={toPath(ups)} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinejoin="round" />
        {/* Dots */}
        {downs.map((v, i) => (
          <circle key={`d${i}`} cx={x(i)} cy={y(v)} r="3" fill="var(--accent)" />
        ))}
        {ups.map((v, i) => (
          <circle key={`u${i}`} cx={x(i)} cy={y(v)} r="3" fill="var(--green)" />
        ))}
      </svg>
      <p className="empty-text" style={{ fontSize: '0.75rem' }}>{sorted.length} test{sorted.length !== 1 ? 's' : ''} recorded</p>
    </div>
  );
}
