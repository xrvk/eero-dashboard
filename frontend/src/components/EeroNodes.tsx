import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface EeroNodesProps {
  networkId: string;
}

export default function EeroNodes({ networkId }: EeroNodesProps) {
  const { data, loading, error } = useFetch(
    () => api.getEeros(networkId),
    [networkId]
  );

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading nodes…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const eeros = data?.eeros ?? [];

  return (
    <div className="eero-nodes">
      <h2>eero Nodes</h2>
      <div className="node-grid">
        {eeros.map((node, i) => (
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
                      <div
                        key={bar}
                        className={`mesh-bar ${bar <= node.mesh_quality_bars! ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  <span className="stat-label">mesh</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
