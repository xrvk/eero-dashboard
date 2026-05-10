import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface SettingsViewProps {
  networkId: string;
}

type SettingsTab = 'security' | 'network' | 'diagnostics';

export default function SettingsView({ networkId }: SettingsViewProps) {
  const [subtab, setSubtab] = useState<SettingsTab>('security');

  return (
    <div className="settings-view">
      <div className="settings-subtabs">
        <button className={`settings-subtab ${subtab === 'security' ? 'active' : ''}`} onClick={() => setSubtab('security')}>
          Security
        </button>
        <button className={`settings-subtab ${subtab === 'network' ? 'active' : ''}`} onClick={() => setSubtab('network')}>
          Network
        </button>
        <button className={`settings-subtab ${subtab === 'diagnostics' ? 'active' : ''}`} onClick={() => setSubtab('diagnostics')}>
          Diagnostics
        </button>
      </div>

      <div className="settings-content">
        {subtab === 'security' && <SecuritySection networkId={networkId} />}
        {subtab === 'network' && <NetworkSection networkId={networkId} />}
        {subtab === 'diagnostics' && <DiagnosticsSection networkId={networkId} />}
      </div>
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

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
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
  );
}

// ── Network (Port Forwards + DHCP Reservations) ─────

function NetworkSection({ networkId }: { networkId: string }) {
  const { data: forwards, loading: fwdLoading, refetch: refetchFwd } = useFetch(
    () => api.getForwards(networkId), [networkId]
  );
  const { data: reservations, loading: resLoading, refetch: refetchRes } = useFetch(
    () => api.getReservations(networkId), [networkId]
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
        ip: fwdForm.ip, gateway_port: Number(fwdForm.gateway_port),
        client_port: Number(fwdForm.client_port), protocol: fwdForm.protocol, description: fwdForm.description,
      });
      setShowFwdForm(false);
      setFwdForm({ ip: '', gateway_port: '', client_port: '', protocol: 'tcp', description: '' });
      await refetchFwd();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteForward = async (fwdUrl: string) => {
    const fwdId = fwdUrl.replace(/\/$/, '').split('/').pop() || '';
    if (confirmDelete !== `fwd-${fwdId}`) { setConfirmDelete(`fwd-${fwdId}`); return; }
    setDeleting(fwdId);
    try { await api.deleteForward(networkId, fwdId); await refetchFwd(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  const handleCreateReservation = async () => {
    setSaving(true);
    try {
      await api.createReservation(networkId, resForm);
      setShowResForm(false);
      setResForm({ ip: '', mac: '', description: '' });
      await refetchRes();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteReservation = async (resUrl: string) => {
    const resId = resUrl.replace(/\/$/, '').split('/').pop() || '';
    if (confirmDelete !== `res-${resId}`) { setConfirmDelete(`res-${resId}`); return; }
    setDeleting(resId);
    try { await api.deleteReservation(networkId, resId); await refetchRes(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  if (fwdLoading || resLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;

  const fwdList = Array.isArray(forwards) ? forwards :
    (forwards as Record<string, unknown>)?.forwards ? (forwards as { forwards: unknown[] }).forwards : [];
  const resList = Array.isArray(reservations) ? reservations :
    (reservations as Record<string, unknown>)?.reservations ? (reservations as { reservations: unknown[] }).reservations : [];

  return (
    <>
      <div className="settings-subsection">
        <div className="section-header-inline">
          <h3>Port Forwards</h3>
          <button className="btn-primary btn-sm" onClick={() => setShowFwdForm(!showFwdForm)}>
            {showFwdForm ? '✕ Cancel' : '+ Add'}
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Ext. Port</th><th>Int. Port</th><th>Protocol</th><th>Device IP</th><th>Desc</th><th>Enabled</th><th></th></tr>
          </thead>
          <tbody>
            {showFwdForm && (
              <tr className="form-row">
                <td><input type="number" placeholder="80" value={fwdForm.gateway_port} onChange={e => setFwdForm({ ...fwdForm, gateway_port: e.target.value })} /></td>
                <td><input type="number" placeholder="80" value={fwdForm.client_port} onChange={e => setFwdForm({ ...fwdForm, client_port: e.target.value })} /></td>
                <td><select value={fwdForm.protocol} onChange={e => setFwdForm({ ...fwdForm, protocol: e.target.value })}><option value="tcp">TCP</option><option value="udp">UDP</option><option value="tcp_udp">Both</option></select></td>
                <td><input placeholder="192.168.86.x" value={fwdForm.ip} onChange={e => setFwdForm({ ...fwdForm, ip: e.target.value })} /></td>
                <td><input placeholder="label" value={fwdForm.description} onChange={e => setFwdForm({ ...fwdForm, description: e.target.value })} /></td>
                <td></td>
                <td><button className="btn-primary btn-sm" onClick={handleCreateForward} disabled={saving || !fwdForm.ip || !fwdForm.gateway_port}>{saving ? '…' : 'Add'}</button></td>
              </tr>
            )}
            {(fwdList as Record<string, unknown>[]).map((f, i) => {
              const fid = String(f.url || '').replace(/\/$/, '').split('/').pop() || String(i);
              return (
                <tr key={i}>
                  <td>{String(f.gateway_port ?? '—')}</td>
                  <td>{String(f.client_port ?? '—')}</td>
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
            {(fwdList as Record<string, unknown>[]).length === 0 && !showFwdForm && (
              <tr><td colSpan={7} className="empty-text" style={{ textAlign: 'center', padding: 20 }}>No port forwards configured</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="settings-subsection">
        <div className="section-header-inline">
          <h3>DHCP Reservations</h3>
          <button className="btn-primary btn-sm" onClick={() => setShowResForm(!showResForm)}>
            {showResForm ? '✕ Cancel' : '+ Add'}
          </button>
        </div>
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
                <td><button className="btn-primary btn-sm" onClick={handleCreateReservation} disabled={saving || !resForm.ip || !resForm.mac}>{saving ? '…' : 'Add'}</button></td>
              </tr>
            )}
            {(resList as Record<string, unknown>[]).map((r, i) => {
              const rid = String(r.url || '').replace(/\/$/, '').split('/').pop() || String(i);
              return (
                <tr key={i}>
                  <td>{String(r.ip ?? '—')}</td>
                  <td>{String(r.mac ?? '—')}</td>
                  <td>{String(r.description ?? r.hostname ?? r.nickname ?? '—')}</td>
                  <td>
                    <button
                      className={`btn-action btn-delete ${confirmDelete === `res-${rid}` ? 'confirming' : ''}`}
                      title={confirmDelete === `res-${rid}` ? 'Click again to confirm' : 'Delete'}
                      onClick={() => handleDeleteReservation(String(r.url || ''))}
                    >{confirmDelete === `res-${rid}` ? '⚠️' : '🗑️'}</button>
                  </td>
                </tr>
              );
            })}
            {(resList as Record<string, unknown>[]).length === 0 && !showResForm && (
              <tr><td colSpan={4} className="empty-text" style={{ textAlign: 'center', padding: 20 }}>No DHCP reservations</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Diagnostics ─────────────────────────────────────

function DiagnosticsSection({ networkId }: { networkId: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setRunning(true); setError('');
    try { setResult(await api.runDiagnostics(networkId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setRunning(false); }
  };

  return (
    <div>
      <p className="empty-text" style={{ marginBottom: 16 }}>
        Run network diagnostics to check connectivity, DNS resolution, and internet access.
      </p>
      <button className="btn-primary" onClick={handleRun} disabled={running}>
        {running ? <><div className="spinner" /> Running…</> : '🔍 Run Diagnostics'}
      </button>
      {result && <pre className="json-preview" style={{ marginTop: 16 }}>{JSON.stringify(result, null, 2)}</pre>}
      {error && <div className="error-banner" style={{ marginTop: 16 }}>{error}</div>}
    </div>
  );
}
