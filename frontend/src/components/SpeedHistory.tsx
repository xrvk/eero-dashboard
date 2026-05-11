import { useState, useMemo, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface SpeedHistoryProps {
  networkId: string;
  /** Bump to trigger a refetch (e.g. after running a speed test) */
  refreshKey?: number;
}

type Range = '7d' | '30d' | '90d' | '1y';
type ViewMode = 'chart' | 'table';

const RANGE_DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
const RANGE_LABELS: Record<Range, string> = { '7d': '7d', '30d': '30d', '90d': '90d', '1y': '1 Year' };

function formatDate(iso: string, includeTime = false) {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  if (!includeTime) return `${month}/${day}`;
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${month}/${day} ${h % 12 || 12}:${m} ${ampm}`;
}

function formatSpeed(val: number | null | undefined) {
  if (val == null) return '—';
  return val.toFixed(1);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="speed-tooltip">
      <p className="speed-tooltip-date">{formatDate(label as string, true)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="speed-tooltip-row" style={{ color: p.color }}>
          <span className="speed-tooltip-label">{p.dataKey === 'down' ? '↓ Download' : '↑ Upload'}</span>
          <span className="speed-tooltip-value">{formatSpeed(p.value)} Mbps</span>
        </p>
      ))}
    </div>
  );
}

function downloadCsv(data: api.SpeedHistoryEntry[], range: Range) {
  const header = 'Date,Download (Mbps),Upload (Mbps)\n';
  const rows = data.map(
    (h) => `${new Date(h.date).toISOString()},${h.down ?? ''},${h.up ?? ''}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const today = new Date().toISOString().slice(0, 10);
  a.download = `speed-history-${range}-${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SpeedHistory({ networkId, refreshKey }: SpeedHistoryProps) {
  const [range, setRange] = useState<Range>('30d');
  const [view, setView] = useState<ViewMode>('chart');

  const { data } = useFetch(
    () => api.getSpeedHistory(networkId),
    [networkId, refreshKey]
  );

  const allHistory = useMemo(() => data?.history ?? [], [data?.history]);

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    const latestTimestamp = allHistory.reduce((latest, entry) => {
      const timestamp = new Date(entry.date).getTime();
      return timestamp > latest ? timestamp : latest;
    }, Number.NEGATIVE_INFINITY);
    if (!Number.isFinite(latestTimestamp)) return [];
    const cutoff = latestTimestamp - days * 86400_000;
    return [...allHistory]
      .filter((h) => new Date(h.date).getTime() > cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allHistory, range]);

  const tableData = useMemo(() => [...filtered].reverse(), [filtered]);

  const handleExport = useCallback(() => downloadCsv(filtered, range), [filtered, range]);

  if (allHistory.length === 0) {
    return <p className="empty-text" style={{ marginTop: 12 }}>Run speed tests to see history</p>;
  }

  if (allHistory.length === 1 && filtered.length <= 1) {
    return <p className="empty-text" style={{ marginTop: 12 }}>Run more speed tests to see trends</p>;
  }

  return (
    <div className="speed-history">
      {/* Header bar */}
      <div className="speed-history-header">
        <h4>Speed History</h4>
        <div className="speed-history-actions">
          {/* Range picker */}
          <div className="speed-range-picker">
            {(Object.keys(RANGE_DAYS) as Range[]).map((r) => (
              <button
                key={r}
                className={`range-pill${range === r ? ' active' : ''}`}
                onClick={() => setRange(r)}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="speed-view-toggle">
            <button
              className={`toggle-btn${view === 'chart' ? ' active' : ''}`}
              onClick={() => setView('chart')}
              title="Chart view"
            ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></button>
            <button
              className={`toggle-btn${view === 'table' ? ' active' : ''}`}
              onClick={() => setView('table')}
              title="Table view"
            ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button>
          </div>

          {/* Export */}
          <button className="speed-export-btn" onClick={handleExport} title="Export CSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> CSV
          </button>
        </div>
      </div>

      {/* Chart view */}
      {view === 'chart' && filtered.length > 1 && (
        <div className="speed-chart-container">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filtered} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatDate(d)}
                tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                stroke="var(--border)"
                minTickGap={40}
              />
              <YAxis
                tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
                stroke="var(--border)"
                tickFormatter={(v) => `${v}`}
                width={50}
                label={{ value: 'Mbps', angle: -90, position: 'insideLeft', fill: 'var(--text-dim)', fontSize: 11, dx: -4 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="down"
                name="Download"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent)' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="up"
                name="Upload"
                stroke="var(--green)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--green)' }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="speed-chart-legend">
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--accent)' }} /> Download</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--green)' }} /> Upload</span>
          </div>
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="speed-table-wrap">
          <table className="speed-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Download (Mbps)</th>
                <th>Upload (Mbps)</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((h, i) => (
                <tr key={i}>
                  <td>{formatDate(h.date, true)}</td>
                  <td className="speed-cell-down">{formatSpeed(h.down)}</td>
                  <td className="speed-cell-up">{formatSpeed(h.up)}</td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr><td colSpan={3} className="empty-text">No data in this range</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="empty-text" style={{ fontSize: '0.75rem', marginTop: 8 }}>
        {filtered.length} test{filtered.length !== 1 ? 's' : ''} in selected range
      </p>
    </div>
  );
}
