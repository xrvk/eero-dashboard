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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
    if (confirmDelete !== `fwd-${fwdId}`) { setConfirmDelete(`fwd-${fwdId}`); return; }
    setDeleting(fwdId);
    try {
      await api.deleteForward(networkId, fwdId);
      await refetchFwd();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally { setDeleting(null); setConfirmDelete(null); }
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
    if (confirmDelete !== `res-${resId}`) { setConfirmDelete(`res-${resId}`); return; }
    setDeleting(resId);
    try {
      await api.deleteReservation(networkId, resId);
      await refetchRes();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete');
    } finally { setDeleting(null); setConfirmDelete(null); }
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

      {showFwdForm && (fwdList as Record<string, unknown>[]).length === 0 && (
        <table className="data-table">
          <thead>
            <tr><th>Ext. Port</th><th>Int. Port</th><th>Protocol</th><th>Device IP</th><th>Desc</th><th></th><th></th></tr>
          </thead>
          <tbody>
            <tr className="form-row">
              <td><input type="number" placeholder="80" value={fwdForm.gateway_port} onChange={e => setFwdForm({ ...fwdForm, gateway_port: e.target.value })} /></td>
              <td><input type="number" placeholder="80" value={fwdForm.client_port} onChange={e => setFwdForm({ ...fwdForm, client_port: e.target.value })} /></td>
              <td>
                <select value={fwdForm.protocol} onChange={e => setFwdForm({ ...fwdForm, protocol: e.target.value })}>
                  <option value="tcp">TCP</option><option value="udp">UDP</option><option value="tcp_udp">Both</option>
                </select>
              </td>
              <td><input placeholder="192.168.86.x" value={fwdForm.ip} onChange={e => setFwdForm({ ...fwdForm, ip: e.target.value })} /></td>
              <td><input placeholder="label" value={fwdForm.description} onChange={e => setFwdForm({ ...fwdForm, description: e.target.value })} /></td>
              <td></td>
              <td>
                <button className="btn-primary btn-sm" onClick={handleCreateForward} disabled={saving || !fwdForm.ip || !fwdForm.gateway_port}>
                  {saving ? '…' : 'Add'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {(fwdList as Record<string, unknown>[]).length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>Ext. Port</th><th>Int. Port</th><th>Protocol</th><th>Device IP</th><th>Desc</th><th>Enabled</th><th></th></tr>
          </thead>
          <tbody>
            {showFwdForm && (
              <tr className="form-row">
                <td><input type="number" placeholder="80" value={fwdForm.gateway_port} onChange={e => setFwdForm({ ...fwdForm, gateway_port: e.target.value })} /></td>
                <td><input type="number" placeholder="80" value={fwdForm.client_port} onChange={e => setFwdForm({ ...fwdForm, client_port: e.target.value })} /></td>
                <td>
                  <select value={fwdForm.protocol} onChange={e => setFwdForm({ ...fwdForm, protocol: e.target.value })}>
                    <option value="tcp">TCP</option><option value="udp">UDP</option><option value="tcp_udp">Both</option>
                  </select>
                </td>
                <td><input placeholder="192.168.86.x" value={fwdForm.ip} onChange={e => setFwdForm({ ...fwdForm, ip: e.target.value })} /></td>
                <td><input placeholder="label" value={fwdForm.description} onChange={e => setFwdForm({ ...fwdForm, description: e.target.value })} /></td>
                <td></td>
                <td>
                  <button className="btn-primary btn-sm" onClick={handleCreateForward} disabled={saving || !fwdForm.ip || !fwdForm.gateway_port}>
                    {saving ? '…' : 'Add'}
                  </button>
                </td>
              </tr>
            )}
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
                    <button
                      className={`btn-action btn-delete ${confirmDelete === `fwd-${fid}` ? 'confirming' : ''}`}
                      title={confirmDelete === `fwd-${fid}` ? 'Click again to confirm' : 'Delete'}
                      disabled={deleting === fid}
                      onClick={() => handleDeleteForward(String(f.url || ''))}
                    >{confirmDelete === `fwd-${fid}` ? '⚠️' : '🗑️'}</button>
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

      {showResForm && (resList as Record<string, unknown>[]).length === 0 && (
        <table className="data-table">
          <thead>
            <tr><th>IP</th><th>MAC</th><th>Name</th><th></th></tr>
          </thead>
          <tbody>
            <tr className="form-row">
              <td><input placeholder="192.168.86.x" value={resForm.ip} onChange={e => setResForm({ ...resForm, ip: e.target.value })} /></td>
              <td><input placeholder="aa:bb:cc:dd:ee:ff" value={resForm.mac} onChange={e => setResForm({ ...resForm, mac: e.target.value })} /></td>
              <td><input placeholder="label" value={resForm.description} onChange={e => setResForm({ ...resForm, description: e.target.value })} /></td>
              <td>
                <button className="btn-primary btn-sm" onClick={handleCreateReservation} disabled={saving || !resForm.ip || !resForm.mac}>
                  {saving ? '…' : 'Add'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {(resList as Record<string, unknown>[]).length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>IP</th><th>MAC</th><th>Name</th><th></th></tr>
          </thead>
          <tbody>
            {showResForm && (
              <tr className="form-row">
                <td><input placeholder="192.168.86.x" value={resForm.ip} onChange={e => setResForm({ ...resForm, ip: e.target.value })} /></td>
                <td><input placeholder="aa:bb:cc:dd:ee:ff" value={resForm.mac} onChange={e => setResForm({ ...resForm, mac: e.target.value })} /></td>
                <td><input placeholder="label" value={resForm.description} onChange={e => setResForm({ ...resForm, description: e.target.value })} /></td>
                <td>
                  <button className="btn-primary btn-sm" onClick={handleCreateReservation} disabled={saving || !resForm.ip || !resForm.mac}>
                    {saving ? '…' : 'Add'}
                  </button>
                </td>
              </tr>
            )}
            {(resList as Record<string, unknown>[]).map((r, i) => (
              <tr key={i}>
                <td>{String(r.ip ?? '—')}</td>
                <td>{String(r.mac ?? '—')}</td>
                <td>{String(r.description ?? r.hostname ?? r.nickname ?? '—')}</td>
                <td>
                  <button
                    className={`btn-action btn-delete ${confirmDelete === `res-${String(r.url || '').replace(/\/$/, '').split('/').pop()}` ? 'confirming' : ''}`}
                    title={confirmDelete?.startsWith('res-') ? 'Click again to confirm' : 'Delete'}
                    onClick={() => handleDeleteReservation(String(r.url || ''))}
                  >{confirmDelete === `res-${String(r.url || '').replace(/\/$/, '').split('/').pop()}` ? '⚠️' : '🗑️'}</button>
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
