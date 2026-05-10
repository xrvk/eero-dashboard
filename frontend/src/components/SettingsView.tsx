import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface SettingsViewProps {
  networkId: string;
}

export default function SettingsView({ networkId }: SettingsViewProps) {
  return (
    <div className="settings-view">
      <SecuritySection networkId={networkId} />
      <SpeedTestSection networkId={networkId} />
      <PortForwardingSection networkId={networkId} />
      <DiagnosticsSection networkId={networkId} />
    </div>
  );
}

// ── Security ────────────────────────────────────────

function SecuritySection({ networkId }: { networkId: string }) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getSecurity(networkId),
    [networkId]
  );
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: string, value: boolean, apiKey?: string) => {
    setSaving(true);
    try {
      await api.updateSecurity(networkId, { [apiKey || key]: value });
      await refetch();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading security…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const settings = data || {};
  const toggles: { key: string; label: string; desc: string; apiKey?: string }[] = [
    { key: 'wpa3', label: 'WPA3', desc: 'Latest WiFi security protocol' },
    { key: 'band_steering', label: 'Band Steering', desc: 'Auto-assign devices to optimal band' },
    { key: 'upnp', label: 'UPnP', desc: 'Allow devices to open ports automatically' },
    { key: 'ipv6_upstream', label: 'IPv6', desc: 'Enable IPv6 networking', apiKey: 'ipv6' },
    { key: 'thread', label: 'Thread', desc: 'IoT mesh networking protocol' },
  ];

  return (
    <div className="settings-section">
      <h2>Security & Network</h2>
      <div className="toggle-list">
        {toggles.map((t) => {
          const val = settings[t.key];
          const isOn = typeof val === 'boolean' ? val : !!val;
          return (
            <div key={t.key} className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-name">{t.label}</span>
                <span className="toggle-desc">{t.desc}</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={isOn}
                  disabled={saving}
                  onChange={() => handleToggle(t.key, !isOn, t.apiKey)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Speed Test ──────────────────────────────────────

function SpeedTestSection({ networkId }: { networkId: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setRunning(true);
    setError('');
    setResult(null);
    try {
      const resp = await api.runSpeedTest(networkId);
      setResult(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speed test failed');
    } finally {
      setRunning(false);
    }
  };

  // Try to get last speed from network detail
  const { data: network } = useFetch(() => api.getNetwork(networkId), [networkId]);
  const lastSpeed = (network as api.Network)?.speed;

  return (
    <div className="settings-section">
      <h2>Speed Test</h2>
      {lastSpeed && lastSpeed.down && (
        <div className="speed-result">
          <div className="speed-stat">
            <span className="speed-dir">↓</span>
            <span className="speed-value">{(lastSpeed.down as { value: number }).value}</span>
            <span className="speed-unit">{(lastSpeed.down as { units: string }).units}</span>
          </div>
          {lastSpeed.up && (
            <div className="speed-stat">
              <span className="speed-dir">↑</span>
              <span className="speed-value">{(lastSpeed.up as { value: number }).value}</span>
              <span className="speed-unit">{(lastSpeed.up as { units: string }).units}</span>
            </div>
          )}
        </div>
      )}
      <button className="btn-primary" onClick={handleRun} disabled={running}>
        {running ? <><div className="spinner" /> Running (~30s)…</> : '🚀 Run Speed Test'}
      </button>
      {result && (
        <pre className="json-preview">{JSON.stringify(result, null, 2)}</pre>
      )}
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

// ── Port Forwarding ─────────────────────────────────

function PortForwardingSection({ networkId }: { networkId: string }) {
  const { data: forwards, loading: fwdLoading } = useFetch(
    () => api.getForwards(networkId),
    [networkId]
  );
  const { data: reservations, loading: resLoading } = useFetch(
    () => api.getReservations(networkId),
    [networkId]
  );

  if (fwdLoading || resLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;

  const fwdList = Array.isArray(forwards) ? forwards :
    (forwards as Record<string, unknown>)?.forwards ? (forwards as { forwards: unknown[] }).forwards :
    [];

  const resList = Array.isArray(reservations) ? reservations :
    (reservations as Record<string, unknown>)?.reservations ? (reservations as { reservations: unknown[] }).reservations :
    [];

  return (
    <div className="settings-section">
      <h2>Port Forwards</h2>
      {(fwdList as Record<string, unknown>[]).length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>Port</th><th>Protocol</th><th>Device IP</th><th>Enabled</th></tr>
          </thead>
          <tbody>
            {(fwdList as Record<string, unknown>[]).map((f, i) => (
              <tr key={i}>
                <td>{String(f.port ?? f.external_port ?? '—')}</td>
                <td>{String(f.protocol ?? '—')}</td>
                <td>{String(f.ip ?? f.lan_ip ?? '—')}</td>
                <td>{f.enabled !== false ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-text">No port forwards configured</p>
      )}

      <h3 style={{ marginTop: 20 }}>DHCP Reservations</h3>
      {(resList as Record<string, unknown>[]).length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>IP</th><th>MAC</th><th>Name</th></tr>
          </thead>
          <tbody>
            {(resList as Record<string, unknown>[]).map((r, i) => (
              <tr key={i}>
                <td>{String(r.ip ?? '—')}</td>
                <td>{String(r.mac ?? '—')}</td>
                <td>{String(r.hostname ?? r.nickname ?? '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-text">No DHCP reservations</p>
      )}
    </div>
  );
}

// ── Diagnostics ─────────────────────────────────────

function DiagnosticsSection({ networkId }: { networkId: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setRunning(true);
    setError('');
    try {
      const resp = await api.runDiagnostics(networkId);
      setResult(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diagnostics failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="settings-section">
      <h2>Diagnostics</h2>
      <button className="btn-primary" onClick={handleRun} disabled={running}>
        {running ? <><div className="spinner" /> Running…</> : '🔍 Run Diagnostics'}
      </button>
      {result && <pre className="json-preview">{JSON.stringify(result, null, 2)}</pre>}
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
