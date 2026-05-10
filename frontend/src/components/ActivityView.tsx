import { useState, useMemo } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface ActivityViewProps {
  networkId: string;
}

interface ConnectedDevice extends api.Device {
  connectivity?: {
    rx_bitrate?: string;
    signal?: string;
    score?: number;
    score_bars?: number;
    frequency?: number;
    snr?: number;
    rx_rate_info?: { rate_bps?: number; channel_width?: string; phy_type?: string; nss?: number };
    tx_rate_info?: { rate_bps?: number };
    packet_stats?: { rx_packets?: number; tx_packets?: number; total_packets?: number; tx_retries?: number };
  };
  source?: { display_name?: string; location?: string };
}

function formatRate(bps?: number) {
  if (!bps) return '—';
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  return `${(bps / 1_000).toFixed(0)} Kbps`;
}

function freqToBand(freq?: number) {
  if (!freq) return '—';
  if (freq < 3000) return '2.4 GHz';
  if (freq < 5900) return '5 GHz';
  return '6 GHz';
}

type SortKey = 'name' | 'signal' | 'rx' | 'packets' | 'band';

export default function ActivityView({ networkId }: ActivityViewProps) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getDevices(networkId),
    [networkId]
  );
  const [sortKey, setSortKey] = useState<SortKey>('signal');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(key === 'name'); }
  };

  const indicator = (key: SortKey) => sortKey !== key ? ' ↕' : sortAsc ? ' ↑' : ' ↓';

  const devices = useMemo(() => {
    const connected = ((data?.devices ?? []) as ConnectedDevice[]).filter(d => d.connected && d.connectivity);
    const sorted = [...connected].sort((a, b) => {
      let va: string | number = 0, vb: string | number = 0;
      switch (sortKey) {
        case 'name':
          va = (a.display_name || a.hostname || '').toLowerCase();
          vb = (b.display_name || b.hostname || '').toLowerCase();
          break;
        case 'signal':
          va = a.connectivity?.score ?? 0;
          vb = b.connectivity?.score ?? 0;
          break;
        case 'rx':
          va = a.connectivity?.rx_rate_info?.rate_bps ?? 0;
          vb = b.connectivity?.rx_rate_info?.rate_bps ?? 0;
          break;
        case 'packets':
          va = a.connectivity?.packet_stats?.total_packets ?? 0;
          vb = b.connectivity?.packet_stats?.total_packets ?? 0;
          break;
        case 'band':
          va = a.connectivity?.frequency ?? 0;
          vb = b.connectivity?.frequency ?? 0;
          break;
      }
      if (va < vb) return -1;
      if (va > vb) return 1;
      return 0;
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [data, sortKey, sortAsc]);

  // Band breakdown
  const bandCounts = useMemo(() => {
    const counts = { '2.4 GHz': 0, '5 GHz': 0, '6 GHz': 0, 'Wired': 0 };
    for (const d of (data?.devices ?? []) as ConnectedDevice[]) {
      if (!d.connected) continue;
      if (!d.wireless) { counts['Wired']++; continue; }
      const band = freqToBand(d.connectivity?.frequency);
      if (band in counts) counts[band as keyof typeof counts]++;
    }
    return counts;
  }, [data]);

  // Node breakdown
  const nodeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of (data?.devices ?? []) as ConnectedDevice[]) {
      if (!d.connected) continue;
      const node = d.source?.display_name || d.source?.location || 'Unknown';
      counts.set(node, (counts.get(node) || 0) + 1);
    }
    return counts;
  }, [data]);

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading activity…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  return (
    <div className="activity-view">
      <div className="section-header">
        <h2>Network Activity</h2>
        <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
      </div>

      {/* Summary cards */}
      <div className="activity-summary">
        <div className="activity-panel">
          <h3>Clients by Band</h3>
          <div className="band-bars">
            {Object.entries(bandCounts).filter(([,c]) => c > 0).map(([band, count]) => (
              <div key={band} className="band-row">
                <span className="band-label">{band}</span>
                <div className="band-bar-track">
                  <div
                    className={`band-bar-fill band-${band.replace(/[\s.]/g, '')}`}
                    style={{ width: `${Math.max(5, (count / (devices.length || 1)) * 100)}%` }}
                  />
                </div>
                <span className="band-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="activity-panel">
          <h3>Clients by Node</h3>
          <div className="band-bars">
            {[...nodeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([node, count]) => (
              <div key={node} className="band-row">
                <span className="band-label">{node}</span>
                <div className="band-bar-track">
                  <div className="band-bar-fill band-node" style={{ width: `${Math.max(5, (count / (devices.length || 1)) * 100)}%` }} />
                </div>
                <span className="band-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connection quality table */}
      <div className="activity-panel full-width" style={{ marginTop: 16 }}>
        <h3>Connection Quality ({devices.length} wireless clients)</h3>
        <div className="activity-table-wrap">
          <table className="device-table">
            <thead>
              <tr>
                <th className="sortable-th" onClick={() => handleSort('name')}>Device{indicator('name')}</th>
                <th className="sortable-th" onClick={() => handleSort('signal')}>Signal{indicator('signal')}</th>
                <th className="sortable-th" onClick={() => handleSort('band')}>Band{indicator('band')}</th>
                <th className="sortable-th" onClick={() => handleSort('rx')}>Speed{indicator('rx')}</th>
                <th className="sortable-th" onClick={() => handleSort('packets')}>Packets{indicator('packets')}</th>
                <th>Node</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d, i) => {
                const conn = d.connectivity!;
                const bars = conn.score_bars ?? 0;
                return (
                  <tr key={d.mac || i}>
                    <td className="td-name">{d.display_name || d.hostname || d.mac || 'Unknown'}</td>
                    <td>
                      <span className="signal-bars">
                        {[1,2,3,4,5].map(b => (
                          <span key={b} className={`sig-bar ${b <= bars ? 'active' : ''}`} />
                        ))}
                      </span>
                      <span className="td-mono" style={{ marginLeft: 6 }}>{conn.signal || '—'}</span>
                    </td>
                    <td><span className={`band-pill band-${freqToBand(conn.frequency).replace(/[\s.]/g, '')}`}>{freqToBand(conn.frequency)}</span></td>
                    <td className="td-mono">{formatRate(conn.rx_rate_info?.rate_bps)}</td>
                    <td className="td-mono">{(conn.packet_stats?.total_packets ?? 0).toLocaleString()}</td>
                    <td className="td-name">{d.source?.display_name || d.source?.location || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="empty-text" style={{ marginTop: 16 }}>
        ℹ️ Bandwidth history and category breakdowns require eero Plus subscription.
      </p>
    </div>
  );
}
