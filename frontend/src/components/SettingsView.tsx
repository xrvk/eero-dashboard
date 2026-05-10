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

// ── Port Forwarding ─────────────────────────────────

function PortForwardingSection({ networkId }: { networkId: string }) {
  const { data: forwards, loading: fwdLoading, refetch: refetchFwd } = useFetch(
    () => api.getForwards(networkId),
    [networkId]
  );
  const { data: reservations, loading: resLoading, refetch: refetchRes } = useFetch(
    () => api.getReservations(networkId),
    [networkId]
  );
  const [showFwdForm, setShowFwdForm] = useState(false);
  const [showResForm, setShowResForm] = useState(false);
  const [fwdForm, setFwdForm] = useState({ ip: '', gateway_port: '', client_port: '', protocol: 'tcp', description: '' });
  const [resForm, setResForm] = useState({ ip: '', mac: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreateForward = async () => {
    setSaving(true);
    try {
      await api.createForward(networkId, {
        ip: fwdForm.ip,
        gateway_port: Number(fwdForm.gateway_port),
        client_port: Number(fwdForm.client_port),
        protocol: fwdForm.protocol,
        description: fwdForm.description,
      });
      setShowFwdForm(false);
      setFwdForm({ ip: '', gateway_port: '', client_port: '', protocol: 'tcp', description: '' });
      await refetchFwd();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create forward');
    } finally { setSaving(false); }
  };

  const handleDeleteForward = async (fwdUrl: string) => {
    const fwdId = fwdUrl.replace(/\/$/, '').split('/').pop() || '';
    setDeleting(fwdId);
    try {
      await api.deleteForward(networkId, fwdId);
      await refetchFwd();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally { setDeleting(null); }
  };

  const handleCreateReservation = async () => {
    setSaving(true);
    try {
      await api.createReservation(networkId, resForm);
      setShowResForm(false);
      setResForm({ ip: '', mac: '', description: '' });
      await refetchRes();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create reservation');
    } finally { setSaving(false); }
  };

  const handleDeleteReservation = async (resUrl: string) => {
    const resId = resUrl.replace(/\/$/, '').split('/').pop() || '';
    setDeleting(resId);
    try {
      await api.deleteReservation(networkId, resId);
      await refetchRes();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally { setDeleting(null); }
  };

  if (fwdLoading || resLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;

  const fwdList = Array.isArray(forwards) ? forwards :
    (forwards as Record<string, unknown>)?.forwards ? (forwards as { forwards: unknown[] }).forwards :
    [];

  const resList = Array.isArray(reservations) ? reservations :
    (reservations as Record<string, unknown>)?.reservations ? (reservations as { reservations: unknown[] }).reservations :
    [];

  return (
    <div className="settings-section">
      <div className="section-header-inline">
        <h2>Port Forwards</h2>
        <button className="btn-primary btn-sm" onClick={() => setShowFwdForm(!showFwdForm)}>
          {showFwdForm ? '✕ Cancel' : '+ Add'}
        </button>
      </div>

      {showFwdForm && (
        <div className="inline-form">
          <input placeholder="Device IP" value={fwdForm.ip} onChange={e => setFwdForm({ ...fwdForm, ip: e.target.value })} />
          <input placeholder="Ext. port" type="number" value={fwdForm.gateway_port} onChange={e => setFwdForm({ ...fwdForm, gateway_port: e.target.value })} />
          <input placeholder="Int. port" type="number" value={fwdForm.client_port} onChange={e => setFwdForm({ ...fwdForm, client_port: e.target.value })} />
          <select value={fwdForm.protocol} onChange={e => setFwdForm({ ...fwdForm, protocol: e.target.value })}>
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
            <option value="tcp_udp">Both</option>
          </select>
          <input placeholder="Description" value={fwdForm.description} onChange={e => setFwdForm({ ...fwdForm, description: e.target.value })} />
          <button className="btn-primary btn-sm" onClick={handleCreateForward} disabled={saving || !fwdForm.ip || !fwdForm.gateway_port}>
            {saving ? '…' : 'Create'}
          </button>
        </div>
      )}

      {(fwdList as Record<string, unknown>[]).length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>Ext. Port</th><th>Int. Port</th><th>Protocol</th><th>Device IP</th><th>Desc</th><th>Enabled</th><th></th></tr>
          </thead>
          <tbody>
            {(fwdList as Record<string, unknown>[]).map((f, i) => {
              const fid = String(f.url || '').replace(/\/$/, '').split('/').pop() || String(i);
              return (
                <tr key={i}>
                  <td>{String(f.gateway_port ?? f.port ?? '—')}</td>
                  <td>{String(f.client_port ?? f.port ?? '—')}</td>
                  <td>{String(f.protocol ?? '—')}</td>
                  <td>{String(f.ip ?? '—')}</td>
                  <td>{String(f.description ?? '—')}</td>
                  <td>{f.enabled !== false ? '✅' : '❌'}</td>
                  <td>
                    <button className="btn-action btn-delete" title="Delete" disabled={deleting === fid}
                      onClick={() => handleDeleteForward(String(f.url || ''))}>🗑️</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-text">No port forwards configured</p>
      )}

      <div className="section-header-inline" style={{ marginTop: 24 }}>
        <h3>DHCP Reservations</h3>
        <button className="btn-primary btn-sm" onClick={() => setShowResForm(!showResForm)}>
          {showResForm ? '✕ Cancel' : '+ Add'}
        </button>
      </div>

      {showResForm && (
        <div className="inline-form">
          <input placeholder="IP address" value={resForm.ip} onChange={e => setResForm({ ...resForm, ip: e.target.value })} />
          <input placeholder="MAC address" value={resForm.mac} onChange={e => setResForm({ ...resForm, mac: e.target.value })} />
          <input placeholder="Description" value={resForm.description} onChange={e => setResForm({ ...resForm, description: e.target.value })} />
          <button className="btn-primary btn-sm" onClick={handleCreateReservation} disabled={saving || !resForm.ip || !resForm.mac}>
            {saving ? '…' : 'Create'}
          </button>
        </div>
      )}

      {(resList as Record<string, unknown>[]).length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>IP</th><th>MAC</th><th>Name</th><th></th></tr>
          </thead>
          <tbody>
            {(resList as Record<string, unknown>[]).map((r, i) => (
              <tr key={i}>
                <td>{String(r.ip ?? '—')}</td>
                <td>{String(r.mac ?? '—')}</td>
                <td>{String(r.description ?? r.hostname ?? r.nickname ?? '—')}</td>
                <td>
                  <button className="btn-action btn-delete" title="Delete"
                    onClick={() => handleDeleteReservation(String(r.url || ''))}>🗑️</button>
                </td>
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
