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

interface DeviceListProps {
  networkId: string;
}

export default function DeviceList({ networkId }: DeviceListProps) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getDevices(networkId),
    [networkId]
  );

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading devices…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const devices = data?.devices ?? [];
  const connected = devices.filter((d) => d.connected);
  const disconnected = devices.filter((d) => !d.connected);

  return (
    <div className="device-list">
      <div className="section-header">
        <h2>
          Connected Devices
          <span className="badge">{connected.length}</span>
        </h2>
        <button className="btn-icon" onClick={refetch} title="Refresh">↻</button>
      </div>

      <div className="device-grid">
        {connected.map((d) => (
          <div key={d.mac || extractId(d.url)} className="device-card connected">
            <div className="device-icon">{getDeviceIcon(d)}</div>
            <div className="device-info">
              <span className="device-name">{d.display_name || d.hostname || 'Unknown'}</span>
              <span className="device-meta">{d.ip || d.mac}</span>
              {d.connection_type && (
                <span className="device-connection">
                  {d.wireless ? '📶' : '🔌'} {d.connection_type}
                </span>
              )}
            </div>
            <div className="device-usage">
              {d.usage && (
                <>
                  <span className="usage-down">↓ {formatBytes(d.usage.down)}</span>
                  <span className="usage-up">↑ {formatBytes(d.usage.up)}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {disconnected.length > 0 && (
        <>
          <div className="section-header secondary">
            <h3>
              Offline
              <span className="badge muted">{disconnected.length}</span>
            </h3>
          </div>
          <div className="device-grid">
            {disconnected.map((d) => (
              <div key={d.mac || extractId(d.url)} className="device-card offline">
                <div className="device-icon dimmed">{getDeviceIcon(d)}</div>
                <div className="device-info">
                  <span className="device-name">{d.display_name || d.hostname || 'Unknown'}</span>
                  <span className="device-meta">{d.mac}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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
