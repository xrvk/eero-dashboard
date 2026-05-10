import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface ActivityViewProps {
  networkId: string;
}

function formatBytes(bytes?: number) {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function ActivityView({ networkId }: ActivityViewProps) {
  const [period, setPeriod] = useState<'day' | 'week'>('day');

  const { data: clients, loading: clientsLoading } = useFetch(
    () => api.getActivityClients(networkId),
    [networkId]
  );

  const { data: categories, loading: catsLoading } = useFetch(
    () => api.getActivityCategories(networkId),
    [networkId]
  );

  const { data: history, loading: histLoading } = useFetch(
    () => api.getActivityHistory(networkId, period),
    [networkId, period]
  );

  const isLoading = clientsLoading || catsLoading || histLoading;

  // Parse client data — handle various API shapes
  const clientList = Array.isArray(clients) ? clients :
    (clients as Record<string, unknown>)?.clients ? (clients as { clients: unknown[] }).clients :
    [];

  const categoryList = Array.isArray(categories) ? categories :
    (categories as Record<string, unknown>)?.categories ? (categories as { categories: unknown[] }).categories :
    [];

  return (
    <div className="activity-view">
      <div className="section-header">
        <h2>Network Activity</h2>
        <div className="period-toggle">
          <button className={`period-btn ${period === 'day' ? 'active' : ''}`} onClick={() => setPeriod('day')}>Day</button>
          <button className={`period-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>Week</button>
        </div>
      </div>

      {isLoading && <div className="card loading-card"><div className="spinner" /> Loading activity…</div>}

      {!isLoading && (
        <div className="activity-panels">
          {/* Top clients by usage */}
          <div className="activity-panel">
            <h3>Top Devices by Usage</h3>
            <div className="activity-list">
              {(clientList as Record<string, unknown>[]).slice(0, 15).map((c, i) => {
                const down = (c.usage as Record<string, number>)?.down ?? (c.rx_bytes as number) ?? 0;
                const up = (c.usage as Record<string, number>)?.up ?? (c.tx_bytes as number) ?? 0;
                const total = down + up;
                const name = (c.display_name as string) || (c.hostname as string) || (c.mac as string) || `Device ${i + 1}`;
                return (
                  <div key={i} className="activity-item">
                    <span className="activity-rank">#{i + 1}</span>
                    <span className="activity-name">{name}</span>
                    <span className="activity-bytes">{formatBytes(total)}</span>
                  </div>
                );
              })}
              {clientList.length === 0 && <p className="empty-text">No client activity data available</p>}
            </div>
          </div>

          {/* Categories */}
          <div className="activity-panel">
            <h3>By Category</h3>
            <div className="activity-list">
              {(categoryList as Record<string, unknown>[]).slice(0, 15).map((cat, i) => {
                const name = (cat.name as string) || (cat.category as string) || `Category ${i + 1}`;
                const bytes = (cat.bytes as number) ?? (cat.usage as number) ?? 0;
                return (
                  <div key={i} className="activity-item">
                    <span className="activity-name">{name}</span>
                    <span className="activity-bytes">{formatBytes(bytes)}</span>
                  </div>
                );
              })}
              {categoryList.length === 0 && <p className="empty-text">No category data available</p>}
            </div>
          </div>

          {/* History summary */}
          <div className="activity-panel full-width">
            <h3>History ({period})</h3>
            {history ? (
              <pre className="json-preview">{JSON.stringify(history, null, 2)}</pre>
            ) : (
              <p className="empty-text">No history data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
