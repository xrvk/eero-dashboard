import { useState, useCallback } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

function CopyableValue({ value }: { value: string | undefined }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  if (!value) return <span className="drawer-value mono">—</span>;
  return (
    <span
      className={`drawer-value mono copyable${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title="Click to copy"
    >
      {copied ? '✓ Copied' : value}
    </span>
  );
}

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

interface DeviceDrawerProps {
  networkId: string;
  device: api.Device;
  onClose: () => void;
  onRefresh: () => void;
}

interface DeviceConnectivity {
  signal?: string;
  score?: number;
  score_bars?: number;
  frequency?: number;
  rx_rate_info?: { rate_bps?: number; channel_width?: string; phy_type?: string };
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

export default function DeviceDrawer({ networkId, device: d, onClose, onRefresh }: DeviceDrawerProps) {
  const deviceId = d.mac || extractId(d.url);
  const conn = (d as Record<string, unknown>).connectivity as DeviceConnectivity | undefined;
  const source = (d as Record<string, unknown>).source as Record<string, unknown> | undefined;

  const [editingName, setEditingName] = useState(false);
  const [nickname, setNickname] = useState(d.display_name || d.hostname || '');
  const [saving, setSaving] = useState(false);

  // Priority
  const { data: priorityData, refetch: refetchPriority } = useFetch(
    () => d.connected ? api.getDevicePriority(networkId, deviceId) : Promise.resolve(null),
    [networkId, deviceId]
  );
  const [priorityLoading, setPriorityLoading] = useState(false);

  // DHCP Reservation
  const { data: reservationsData, refetch: refetchReservations } = useFetch(
    () => api.getReservations(networkId), [networkId]
  );
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveIp, setReserveIp] = useState(d.ip || '');

  const reservationsList = Array.isArray(reservationsData) ? reservationsData :
    (reservationsData as Record<string, unknown>)?.reservations
      ? (reservationsData as { reservations: Record<string, unknown>[] }).reservations : [];

  const existingReservation = reservationsList.find(
    (r) => String(r.mac).toLowerCase() === (d.mac || '').toLowerCase()
  ) as Record<string, unknown> | undefined;

  const handleReserve = async () => {
    if (!d.mac || !reserveIp) return;
    setReserveLoading(true);
    try {
      await api.createReservation(networkId, {
        ip: reserveIp,
        mac: d.mac,
        description: d.display_name || d.hostname || '',
      });
      await refetchReservations();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create reservation');
    } finally {
      setReserveLoading(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!existingReservation?.url) return;
    const id = String(existingReservation.url).replace(/\/$/, '').split('/').pop() || '';
    setReserveLoading(true);
    try {
      await api.deleteReservation(networkId, id);
      await refetchReservations();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to remove reservation');
    } finally {
      setReserveLoading(false);
    }
  };

  const isPrioritized = !!(priorityData as Record<string, unknown>)?.prioritized;

  const handleRename = async () => {
    if (!nickname.trim()) return;
    setSaving(true);
    try {
      await api.setDeviceNickname(networkId, deviceId, nickname.trim());
      onRefresh();
      setEditingName(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to rename');
    } finally {
      setSaving(false);
    }
  };

  const handlePriority = async (prioritized: boolean, duration?: number) => {
    setPriorityLoading(true);
    try {
      await api.setDevicePriority(networkId, deviceId, prioritized, duration);
      await refetchPriority();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to set priority');
    } finally {
      setPriorityLoading(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>Device Detail</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {/* Name */}
          <div className="drawer-section">
            <label className="drawer-label">Name</label>
            {editingName ? (
              <div className="drawer-inline-edit">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                  autoFocus
                />
                <button className="btn-primary btn-sm" onClick={handleRename} disabled={saving}>
                  {saving ? '…' : 'Save'}
                </button>
                <button className="btn-cancel btn-sm" onClick={() => { setEditingName(false); setNickname(d.display_name || d.hostname || ''); }}>
                  Cancel
                </button>
              </div>
            ) : (
              <div className="drawer-value-row">
                <span className="drawer-value">{d.display_name || d.hostname || 'Unknown'}</span>
                <button className="btn-text" onClick={() => setEditingName(true)}>Rename</button>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="drawer-grid">
            <div className="drawer-field">
              <label className="drawer-label">Status</label>
              <span className={`drawer-value ${d.connected ? 'text-green' : 'text-muted'}`}>
                {d.connected ? '● Online' : '● Offline'}
              </span>
            </div>
            <div className="drawer-field">
              <label className="drawer-label">Connection</label>
              <span className="drawer-value">{d.wireless ? '📶 Wireless' : '🔌 Wired'}</span>
            </div>
            <div className="drawer-field">
              <label className="drawer-label">IP Address</label>
              <CopyableValue value={d.ip} />
            </div>
            <div className="drawer-field">
              <label className="drawer-label">MAC</label>
              <CopyableValue value={d.mac} />
            </div>
            {d.manufacturer && (
              <div className="drawer-field">
                <label className="drawer-label">Manufacturer</label>
                <span className="drawer-value">{d.manufacturer}</span>
              </div>
            )}
            {d.device_type && (
              <div className="drawer-field">
                <label className="drawer-label">Device Type</label>
                <span className="drawer-value">{d.device_type}</span>
              </div>
            )}
            {source && (
              <div className="drawer-field">
                <label className="drawer-label">Connected To</label>
                <span className="drawer-value">
                  📡 {(source.display_name as string) || (source.location as string) || 'Unknown node'}
                </span>
              </div>
            )}
            {d.profile && (
              <div className="drawer-field">
                <label className="drawer-label">Profile</label>
                <span className="drawer-value">👤 {d.profile.name || 'Default'}</span>
              </div>
            )}
          </div>

          {/* Wireless details */}
          {d.wireless && conn && (
            <div className="drawer-section">
              <h3>Wireless Details</h3>
              <div className="drawer-grid">
                {conn.frequency && (
                  <div className="drawer-field">
                    <label className="drawer-label">Band</label>
                    <span className={`band-pill band-${freqToBand(conn.frequency).replace(/[\s.]/g, '')}`}>
                      {freqToBand(conn.frequency)}
                    </span>
                  </div>
                )}
                {conn.signal && (
                  <div className="drawer-field">
                    <label className="drawer-label">Signal</label>
                    <span className="drawer-value">
                      {conn.score_bars != null && (
                        <span className="signal-bars" style={{ marginRight: 6 }}>
                          {[1,2,3,4,5].map(b => (
                            <span key={b} className={`sig-bar ${b <= (conn.score_bars ?? 0) ? 'active' : ''}`} />
                          ))}
                        </span>
                      )}
                      {conn.signal}
                    </span>
                  </div>
                )}
                {conn.rx_rate_info?.rate_bps && (
                  <div className="drawer-field">
                    <label className="drawer-label">Link Speed</label>
                    <span className="drawer-value mono">{formatRate(conn.rx_rate_info.rate_bps)}</span>
                  </div>
                )}
                {conn.rx_rate_info?.channel_width && (
                  <div className="drawer-field">
                    <label className="drawer-label">Channel Width</label>
                    <span className="drawer-value">{conn.rx_rate_info.channel_width}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Priority Boost */}
          {d.connected && (
            <div className="drawer-section">
              <h3>Priority Boost</h3>
              <p className="drawer-desc">Give this device priority bandwidth for better performance.</p>
              {isPrioritized ? (
                <div className="priority-active">
                  <span className="priority-badge">⚡ Priority Active</span>
                  <button
                    className="btn-cancel btn-sm"
                    onClick={() => handlePriority(false)}
                    disabled={priorityLoading}
                  >
                    {priorityLoading ? '…' : 'Remove'}
                  </button>
                </div>
              ) : (
                <div className="priority-buttons">
                  <button className="btn-primary btn-sm" onClick={() => handlePriority(true, 60)} disabled={priorityLoading}>
                    1 hour
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => handlePriority(true, 120)} disabled={priorityLoading}>
                    2 hours
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => handlePriority(true, 240)} disabled={priorityLoading}>
                    4 hours
                  </button>
                  <button className="btn-primary btn-sm" onClick={() => handlePriority(true)} disabled={priorityLoading}>
                    Until off
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DHCP IP Reservation */}
          {d.mac && (
            <div className="drawer-section">
              <h3>DHCP Reservation</h3>
              <p className="drawer-desc">Reserve a static IP for this device on the DHCP server.</p>
              {existingReservation ? (
                <div className="priority-active">
                  <span className="priority-badge reservation-badge">📌 Reserved: <span className="mono">{String(existingReservation.ip)}</span></span>
                  <button
                    className="btn-cancel btn-sm"
                    onClick={handleDeleteReservation}
                    disabled={reserveLoading}
                  >
                    {reserveLoading ? '…' : 'Remove'}
                  </button>
                </div>
              ) : (
                <div className="reserve-ip-form">
                  <div className="drawer-inline-edit">
                    <input
                      type="text"
                      className="mono"
                      placeholder="192.168.86.x"
                      value={reserveIp}
                      onChange={(e) => setReserveIp(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleReserve(); }}
                    />
                    <button
                      className="btn-primary btn-sm"
                      onClick={handleReserve}
                      disabled={reserveLoading || !reserveIp}
                    >
                      {reserveLoading ? '…' : '📌 Reserve'}
                    </button>
                  </div>
                  <span className="drawer-hint">MAC: {d.mac}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
