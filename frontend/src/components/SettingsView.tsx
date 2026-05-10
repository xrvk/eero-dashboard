import { useState } from 'react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

// ── Security ────────────────────────────────────────

export function SecuritySettings({ networkId }: { networkId: string }) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getSecurity(networkId), [networkId]
  );
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: string, value: boolean, apiKey?: string) => {
    setSaving(true);
    try {
      await api.updateSecurity(networkId, { [apiKey || key]: value });
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
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
              <input type="checkbox" checked={isOn} disabled={saving}
                onChange={() => handleToggle(t.key, !isOn, t.apiKey)} />
              <span className="toggle-slider" />
            </label>
          </div>
        );
      })}
    </div>
  );
}

// ── DNS ─────────────────────────────────────────────

export function DnsSettings({ networkId }: { networkId: string }) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getDns(networkId), [networkId]
  );
  const [editing, setEditing] = useState(false);
  const [dnsMode, setDnsMode] = useState('');
  const [customServers, setCustomServers] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const dns = (data as Record<string, unknown>)?.dns as Record<string, unknown> | undefined;
  const mode = dns?.mode as string || 'default';
  const customIps = (dns?.custom as { ips?: string[] })?.ips ?? [];
  const parentIps = (dns?.parent as { ips?: string[] })?.ips ?? [];
  const caching = dns?.caching as boolean | undefined;
  const ddns = (data as Record<string, unknown>)?.ddns as { enabled?: boolean; subdomain?: string } | undefined;

  const startEditing = () => {
    setDnsMode(mode);
    setCustomServers(customIps.join(', '));
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const servers = dnsMode === 'custom'
        ? customServers.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
        : undefined;
      await api.setDnsMode(networkId, dnsMode, servers);
      await refetch();
      setEditing(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCachingToggle = async () => {
    setSaving(true);
    try {
      await api.setDnsCaching(networkId, !caching);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      {/* Caching toggle */}
      <div className="toggle-row" style={{ marginBottom: 16 }}>
        <div className="toggle-info">
          <span className="toggle-name">DNS Caching</span>
          <span className="toggle-desc">Cache DNS lookups locally for faster resolution</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={!!caching} disabled={saving} onChange={handleCachingToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      {/* DNS Mode */}
      <div className="settings-subsection">
        <div className="section-header-inline">
          <h3>DNS Servers</h3>
          {!editing && (
            <button className="btn-text" onClick={startEditing}>✏️ Edit</button>
          )}
        </div>

        {editing ? (
          <div className="dns-edit-form">
            <div className="dns-mode-select">
              <label className={`dns-mode-option ${dnsMode === 'default' ? 'selected' : ''}`}>
                <input type="radio" name="dns-mode" value="default" checked={dnsMode === 'default'}
                  onChange={() => setDnsMode('default')} />
                <div>
                  <span className="dns-mode-label">Default</span>
                  <span className="dns-mode-desc">Use eero's DNS servers</span>
                </div>
              </label>
              <label className={`dns-mode-option ${dnsMode === 'custom' ? 'selected' : ''}`}>
                <input type="radio" name="dns-mode" value="custom" checked={dnsMode === 'custom'}
                  onChange={() => setDnsMode('custom')} />
                <div>
                  <span className="dns-mode-label">Custom</span>
                  <span className="dns-mode-desc">Use your own DNS servers</span>
                </div>
              </label>
            </div>

            {dnsMode === 'custom' && (
              <div style={{ marginTop: 12 }}>
                <label className="dns-input-label">DNS Server IPs (comma separated)</label>
                <input
                  className="dns-input"
                  type="text"
                  placeholder="192.168.86.5, 1.1.1.1"
                  value={customServers}
                  onChange={(e) => setCustomServers(e.target.value)}
                />
              </div>
            )}

            <div className="dns-edit-actions">
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="dns-grid">
              <div className="dns-item">
                <span className="dns-label">Mode</span>
                <span className="dns-value">{mode}</span>
              </div>
              {ddns && (
                <div className="dns-item">
                  <span className="dns-label">Dynamic DNS</span>
                  <span className="dns-value">{ddns.enabled ? `✅ ${ddns.subdomain || ''}` : 'Disabled'}</span>
                </div>
              )}
            </div>

            {customIps.length > 0 && (
              <div className="dns-servers">
                <span className="dns-label">Custom DNS</span>
                <div className="dns-server-list">
                  {customIps.map((ip, i) => (
                    <span key={i} className="dns-server-chip">{ip}</span>
                  ))}
                </div>
              </div>
            )}

            {parentIps.length > 0 && (
              <div className="dns-servers">
                <span className="dns-label">ISP Upstream</span>
                <div className="dns-server-list">
                  {parentIps.map((ip, i) => (
                    <span key={i} className="dns-server-chip muted">{ip}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Port Forwards ───────────────────────────────────

export function PortForwardsSettings({ networkId }: { networkId: string }) {
  const { data: forwards, loading, refetch } = useFetch(
    () => api.getForwards(networkId), [networkId]
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ip: '', gateway_port: '', client_port: '', protocol: 'tcp', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.createForward(networkId, {
        ip: form.ip, gateway_port: Number(form.gateway_port),
        client_port: Number(form.client_port), protocol: form.protocol, description: form.description,
      });
      setShowForm(false);
      setForm({ ip: '', gateway_port: '', client_port: '', protocol: 'tcp', description: '' });
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (url: string) => {
    const id = url.replace(/\/$/, '').split('/').pop() || '';
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setDeleting(id);
    try { await api.deleteForward(networkId, id); await refetch(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;

  const list = Array.isArray(forwards) ? forwards :
    (forwards as Record<string, unknown>)?.forwards ? (forwards as { forwards: unknown[] }).forwards : [];

  return (
    <div>
      <div className="section-header-inline" style={{ marginBottom: 12 }}>
        <span className="results-counter">{(list as unknown[]).length} forward{(list as unknown[]).length !== 1 ? 's' : ''}</span>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add'}
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>Ext. Port</th><th>Int. Port</th><th>Protocol</th><th>Device IP</th><th>Desc</th><th>On</th><th></th></tr>
        </thead>
        <tbody>
          {showForm && (
            <tr className="form-row">
              <td><input type="number" placeholder="80" value={form.gateway_port} onChange={e => setForm({ ...form, gateway_port: e.target.value })} /></td>
              <td><input type="number" placeholder="80" value={form.client_port} onChange={e => setForm({ ...form, client_port: e.target.value })} /></td>
              <td><select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}><option value="tcp">TCP</option><option value="udp">UDP</option><option value="tcp_udp">Both</option></select></td>
              <td><input placeholder="192.168.86.x" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></td>
              <td><input placeholder="label" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></td>
              <td></td>
              <td><button className="btn-primary btn-sm" onClick={handleCreate} disabled={saving || !form.ip || !form.gateway_port}>{saving ? '…' : 'Add'}</button></td>
            </tr>
          )}
          {(list as Record<string, unknown>[]).map((f, i) => {
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
                  <button className={`btn-action btn-delete ${confirmDelete === fid ? 'confirming' : ''}`}
                    disabled={deleting === fid} onClick={() => handleDelete(String(f.url || ''))}
                  >{confirmDelete === fid ? '⚠️' : '🗑️'}</button>
                </td>
              </tr>
            );
          })}
          {(list as unknown[]).length === 0 && !showForm && (
            <tr><td colSpan={7} className="empty-text" style={{ textAlign: 'center', padding: 20 }}>No port forwards</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── DHCP Reservations ───────────────────────────────

export function DhcpReservationsSettings({ networkId }: { networkId: string }) {
  const { data: reservations, loading, refetch } = useFetch(
    () => api.getReservations(networkId), [networkId]
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ip: '', mac: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.createReservation(networkId, form);
      setShowForm(false);
      setForm({ ip: '', mac: '', description: '' });
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (url: string) => {
    const id = url.replace(/\/$/, '').split('/').pop() || '';
    if (confirmDelete !== id) { setConfirmDelete(id); return; }
    setDeleting(id);
    try { await api.deleteReservation(networkId, id); await refetch(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDeleting(null); setConfirmDelete(null); }
  };

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;

  const list = Array.isArray(reservations) ? reservations :
    (reservations as Record<string, unknown>)?.reservations ? (reservations as { reservations: unknown[] }).reservations : [];

  return (
    <div>
      <div className="section-header-inline" style={{ marginBottom: 12 }}>
        <span className="results-counter">{(list as unknown[]).length} reservation{(list as unknown[]).length !== 1 ? 's' : ''}</span>
        <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add'}
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr><th>IP</th><th>MAC</th><th>Name</th><th></th></tr>
        </thead>
        <tbody>
          {showForm && (
            <tr className="form-row">
              <td><input placeholder="192.168.86.x" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></td>
              <td><input placeholder="aa:bb:cc:dd:ee:ff" value={form.mac} onChange={e => setForm({ ...form, mac: e.target.value })} /></td>
              <td><input placeholder="label" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></td>
              <td><button className="btn-primary btn-sm" onClick={handleCreate} disabled={saving || !form.ip || !form.mac}>{saving ? '…' : 'Add'}</button></td>
            </tr>
          )}
          {(list as Record<string, unknown>[]).map((r, i) => {
            const rid = String(r.url || '').replace(/\/$/, '').split('/').pop() || String(i);
            return (
              <tr key={i}>
                <td>{String(r.ip ?? '—')}</td>
                <td>{String(r.mac ?? '—')}</td>
                <td>{String(r.description ?? r.hostname ?? r.nickname ?? '—')}</td>
                <td>
                  <button className={`btn-action btn-delete ${confirmDelete === rid ? 'confirming' : ''}`}
                    onClick={() => handleDelete(String(r.url || ''))}
                  >{confirmDelete === rid ? '⚠️' : '🗑️'}</button>
                </td>
              </tr>
            );
          })}
          {(list as unknown[]).length === 0 && !showForm && (
            <tr><td colSpan={4} className="empty-text" style={{ textAlign: 'center', padding: 20 }}>No DHCP reservations</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Diagnostics ─────────────────────────────────────

export function DiagnosticsSettings({ networkId }: { networkId: string }) {
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
