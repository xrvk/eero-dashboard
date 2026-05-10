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
  const [rebooting, setRebooting] = useState(false);
  const [confirmReboot, setConfirmReboot] = useState(false);

  const handleRun = async () => {
    setRunning(true); setError('');
    try { setResult(await api.runDiagnostics(networkId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setRunning(false); }
  };

  const handleRebootNetwork = async () => {
    setRebooting(true);
    try {
      await api.rebootNetwork(networkId);
      setConfirmReboot(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Reboot failed'); }
    finally { setRebooting(false); }
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

      <div className="settings-subsection" style={{ marginTop: 32 }}>
        <h3>Network Reboot</h3>
        <p className="toggle-desc" style={{ marginBottom: 12 }}>
          Reboot all eero nodes in the network. The network will be offline for ~2 minutes.
        </p>
        {confirmReboot ? (
          <div className="confirm-inline">
            <span>⚠️ Are you sure? This will take all nodes offline.</span>
            <button className="btn-confirm btn-danger" onClick={handleRebootNetwork} disabled={rebooting}>
              {rebooting ? 'Rebooting…' : 'Confirm Reboot'}
            </button>
            <button className="btn-cancel" onClick={() => setConfirmReboot(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn-danger" onClick={() => setConfirmReboot(true)}>
            🔄 Reboot Entire Network
          </button>
        )}
      </div>
    </div>
  );
}

// ── SQM / QoS ───────────────────────────────────────

export function SqmSettings({ networkId }: { networkId: string }) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getSqm(networkId), [networkId]
  );
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploadMbps, setUploadMbps] = useState('');
  const [downloadMbps, setDownloadMbps] = useState('');

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const sqm = data as Record<string, unknown> || {};
  const enabled = !!sqm.enabled;
  const currentUpload = sqm.upload_bandwidth_mbps as number | undefined;
  const currentDownload = sqm.download_bandwidth_mbps as number | undefined;
  const mode = (sqm.mode as string) || 'auto';

  const handleToggle = async () => {
    setSaving(true);
    try {
      await api.setSqmEnabled(networkId, !enabled);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleAuto = async () => {
    setSaving(true);
    try {
      await api.setSqmAuto(networkId);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const startManual = () => {
    setUploadMbps(currentUpload ? String(currentUpload) : '');
    setDownloadMbps(currentDownload ? String(currentDownload) : '');
    setEditMode(true);
  };

  const handleSaveManual = async () => {
    setSaving(true);
    try {
      await api.configureSqm(
        networkId,
        true,
        uploadMbps ? Number(uploadMbps) : undefined,
        downloadMbps ? Number(downloadMbps) : undefined
      );
      await refetch();
      setEditMode(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="toggle-row" style={{ marginBottom: 20 }}>
        <div className="toggle-info">
          <span className="toggle-name">Smart Queue Management</span>
          <span className="toggle-desc">Reduce bufferbloat and latency for gaming, video calls, and streaming</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} disabled={saving} onChange={handleToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      {enabled && (
        <div className="sqm-config">
          <div className="dns-grid" style={{ marginBottom: 16 }}>
            <div className="dns-item">
              <span className="dns-label">Mode</span>
              <span className="dns-value">{mode}</span>
            </div>
            {currentUpload != null && (
              <div className="dns-item">
                <span className="dns-label">Upload Limit</span>
                <span className="dns-value">{currentUpload} Mbps</span>
              </div>
            )}
            {currentDownload != null && (
              <div className="dns-item">
                <span className="dns-label">Download Limit</span>
                <span className="dns-value">{currentDownload} Mbps</span>
              </div>
            )}
          </div>

          {editMode ? (
            <div className="sqm-edit-form">
              <div className="form-field">
                <label>Upload (Mbps)</label>
                <input type="number" value={uploadMbps} onChange={(e) => setUploadMbps(e.target.value)}
                  placeholder="e.g. 50" min="1" />
              </div>
              <div className="form-field">
                <label>Download (Mbps)</label>
                <input type="number" value={downloadMbps} onChange={(e) => setDownloadMbps(e.target.value)}
                  placeholder="e.g. 500" min="1" />
              </div>
              <div className="dns-edit-actions">
                <button className="btn-primary" onClick={handleSaveManual} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn-cancel" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="sqm-mode-buttons">
              <button className="btn-primary btn-sm" onClick={handleAuto} disabled={saving}>
                Auto Optimize
              </button>
              <button className="btn-text" onClick={startManual}>
                ✏️ Set Manual Limits
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Firmware Updates ────────────────────────────────

export function UpdatesSettings({ networkId }: { networkId: string }) {
  const { data, loading, error } = useFetch(
    () => api.getUpdates(networkId), [networkId]
  );

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const updates = data as Record<string, unknown> || {};

  return (
    <div>
      <div className="dns-grid">
        {updates.current_version && (
          <div className="dns-item">
            <span className="dns-label">Current Version</span>
            <span className="dns-value mono">{String(updates.current_version)}</span>
          </div>
        )}
        {updates.target_firmware && (
          <div className="dns-item">
            <span className="dns-label">Target Firmware</span>
            <span className="dns-value mono">{String(updates.target_firmware)}</span>
          </div>
        )}
        {updates.update_required != null && (
          <div className="dns-item">
            <span className="dns-label">Update Status</span>
            <span className={`dns-value ${updates.update_required ? 'text-yellow' : 'text-green'}`}>
              {updates.update_required ? '⚠️ Update Available' : '✅ Up to Date'}
            </span>
          </div>
        )}
        {updates.is_update_in_progress != null && updates.is_update_in_progress && (
          <div className="dns-item">
            <span className="dns-label">Progress</span>
            <span className="dns-value text-yellow">🔄 Update in progress…</span>
          </div>
        )}
      </div>
      {Object.keys(updates).length === 0 && (
        <p className="empty-text">No update information available</p>
      )}
      {/* Show raw data for any extra fields */}
      {Object.keys(updates).filter(k => !['current_version','target_firmware','update_required','is_update_in_progress'].includes(k)).length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary className="btn-text">Show all details</summary>
          <pre className="json-preview" style={{ marginTop: 8 }}>{JSON.stringify(updates, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

// ── Thread / Smart Home ────────────────────────────

export function ThreadSettings({ networkId }: { networkId: string }) {
  const { data: threadData, loading: threadLoading, error: threadError } = useFetch(
    () => api.getThread(networkId), [networkId]
  );
  const { data: routingData, loading: routingLoading } = useFetch(
    () => api.getRouting(networkId), [networkId]
  );

  if (threadLoading || routingLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (threadError) return <div className="card error-card">Error: {threadError}</div>;

  const thread = threadData as Record<string, unknown> || {};
  const routing = routingData as Record<string, unknown> || {};

  return (
    <div>
      <div className="settings-subsection">
        <h3>Thread Border Router</h3>
        {Object.keys(thread).length > 0 ? (
          <pre className="json-preview">{JSON.stringify(thread, null, 2)}</pre>
        ) : (
          <p className="empty-text">No Thread data available. Thread may not be enabled on this network.</p>
        )}
      </div>

      <div className="settings-subsection" style={{ marginTop: 20 }}>
        <h3>Routing</h3>
        {Object.keys(routing).length > 0 ? (
          <pre className="json-preview">{JSON.stringify(routing, null, 2)}</pre>
        ) : (
          <p className="empty-text">No routing data available</p>
        )}
      </div>
    </div>
  );
}

// ── Device Blacklist ────────────────────────────────

export function BlacklistSettings({ networkId }: { networkId: string }) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getBlacklist(networkId), [networkId]
  );
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleRemove = async (deviceId: string) => {
    if (confirmRemove !== deviceId) { setConfirmRemove(deviceId); return; }
    setRemoving(deviceId);
    try {
      await api.removeFromBlacklist(networkId, deviceId);
      await refetch();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setRemoving(null); setConfirmRemove(null); }
  };

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const blacklist = Array.isArray(data) ? data :
    (data as Record<string, unknown>)?.blacklist ? ((data as Record<string, unknown>).blacklist as unknown[]) : [];

  return (
    <div>
      <p className="toggle-desc" style={{ marginBottom: 16 }}>
        Permanently blocked devices. Unlike temporary blocks, blacklisted devices cannot reconnect until removed.
      </p>

      {(blacklist as Record<string, unknown>[]).length > 0 ? (
        <table className="data-table">
          <thead>
            <tr><th>Device</th><th>MAC</th><th></th></tr>
          </thead>
          <tbody>
            {(blacklist as Record<string, unknown>[]).map((d, i) => {
              const did = String(d.mac || d.url || i);
              return (
                <tr key={i}>
                  <td>{String(d.display_name || d.hostname || d.nickname || 'Unknown')}</td>
                  <td className="td-mono">{String(d.mac || '—')}</td>
                  <td>
                    <button
                      className={`btn-action btn-delete ${confirmRemove === did ? 'confirming' : ''}`}
                      disabled={removing === did}
                      onClick={() => handleRemove(did)}
                    >
                      {confirmRemove === did ? '⚠️ Confirm' : '🗑️'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <p className="empty-icon">🚫</p>
          <p className="empty-text">No blacklisted devices</p>
        </div>
      )}
    </div>
  );
}

// ── General Settings ────────────────────────────────

export function GeneralSettings({ networkId }: { networkId: string }) {
  const { data: settingsData, loading: sLoading, error: sError } = useFetch(
    () => api.getSettings(networkId), [networkId]
  );
  const { data: passwordData, loading: pLoading } = useFetch(
    () => api.getPassword(networkId), [networkId]
  );
  const { data: updatesData, loading: uLoading } = useFetch(
    () => api.getUpdates(networkId), [networkId]
  );
  const { data: threadData, loading: tLoading } = useFetch(
    () => api.getThread(networkId), [networkId]
  );
  const { data: routingData, loading: rLoading } = useFetch(
    () => api.getRouting(networkId), [networkId]
  );
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagResult, setDiagResult] = useState<Record<string, unknown> | null>(null);
  const [diagError, setDiagError] = useState('');
  const [rebooting, setRebooting] = useState(false);
  const [confirmReboot, setConfirmReboot] = useState(false);

  const isLoading = sLoading || pLoading || uLoading || tLoading || rLoading;
  if (isLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (sError) return <div className="card error-card">Error: {sError}</div>;

  const settings = settingsData as Record<string, unknown> || {};
  const pw = passwordData as Record<string, unknown> || {};
  const password = String(pw.password || pw.key || '');
  const networkName = String(settings.name || settings.ssid || '');
  const updates = updatesData as Record<string, unknown> || {};
  const thread = threadData as Record<string, unknown> || {};
  const routing = routingData as Record<string, unknown> || {};
  const wanIp = String(settings.wan_ip || '');
  const gatewayIp = String(settings.gateway_ip || '');
  const timezone = (settings.timezone as Record<string, unknown>)?.value as string || '';

  const handleRename = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.setNetworkName(networkId, newName.trim());
      setRenaming(false);
      window.location.reload();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleRunDiagnostics = async () => {
    setDiagRunning(true); setDiagError('');
    try { setDiagResult(await api.runDiagnostics(networkId)); }
    catch (e) { setDiagError(e instanceof Error ? e.message : 'Failed'); }
    finally { setDiagRunning(false); }
  };

  const handleRebootNetwork = async () => {
    setRebooting(true);
    try {
      await api.rebootNetwork(networkId);
      setConfirmReboot(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Reboot failed'); }
    finally { setRebooting(false); }
  };

  return (
    <div className="general-settings">
      {/* Top cards row */}
      <div className="general-cards">
        {/* Network Identity */}
        <div className="general-card">
          <div className="general-card-header">
            <span className="general-card-icon">📡</span>
            <h3>Network</h3>
            {!renaming && <button className="btn-text" onClick={() => { setNewName(networkName); setRenaming(true); }}>✏️</button>}
          </div>
          {renaming ? (
            <div className="drawer-inline-edit">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                autoFocus />
              <button className="btn-primary btn-sm" onClick={handleRename} disabled={saving}>
                {saving ? '…' : '✓'}
              </button>
              <button className="btn-cancel btn-sm" onClick={() => setRenaming(false)}>✕</button>
            </div>
          ) : (
            <span className="general-card-value">{networkName || '—'}</span>
          )}
          <div className="general-card-details">
            {wanIp && <div className="general-detail"><span>WAN</span><span className="mono">{wanIp}</span></div>}
            {gatewayIp && <div className="general-detail"><span>Gateway</span><span className="mono">{gatewayIp}</span></div>}
            {timezone && <div className="general-detail"><span>Timezone</span><span>{timezone}</span></div>}
          </div>
        </div>

        {/* Password */}
        <div className="general-card">
          <div className="general-card-header">
            <span className="general-card-icon">🔑</span>
            <h3>Wi-Fi Password</h3>
          </div>
          <div className="general-password">
            <span className="general-card-value mono">
              {showPassword ? password : '••••••••••'}
            </span>
            <div className="general-password-actions">
              <button className="btn-icon-sm" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
              {password && (
                <button className="btn-icon-sm" onClick={handleCopy}>
                  {copied ? '✅' : '📋'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Firmware */}
        <div className="general-card">
          <div className="general-card-header">
            <span className="general-card-icon">⬆️</span>
            <h3>Firmware</h3>
          </div>
          {updates.target_firmware ? (
            <>
              <span className="general-card-value mono">{String(updates.target_firmware)}</span>
              <div className="general-card-details">
                <div className="general-detail">
                  <span>Status</span>
                  <span className={updates.update_required ? 'text-yellow' : 'text-green'}>
                    {updates.update_required ? '⚠️ Update available' : '✅ Up to date'}
                  </span>
                </div>
                {updates.has_update && (
                  <div className="general-detail">
                    <span>Update</span>
                    <span className="mono">{String(updates.update_to_firmware || '')}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <span className="empty-text">No firmware info</span>
          )}
        </div>
      </div>

      {/* Thread summary (just the status line, not raw JSON) */}
      {thread.enabled != null && (
        <div className="general-section">
          <h3>🧵 Thread</h3>
          <div className="general-info-grid">
            <div className="general-detail"><span>Status</span><span className={thread.enabled ? 'text-green' : 'text-muted'}>{thread.enabled ? '● Enabled' : '○ Disabled'}</span></div>
            {thread.name && <div className="general-detail"><span>Network</span><span className="mono">{String(thread.name)}</span></div>}
            {thread.channel && <div className="general-detail"><span>Channel</span><span>{String(thread.channel)}</span></div>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="general-actions-row">
        <div className="general-section">
          <h3>🔍 Diagnostics</h3>
          <p className="toggle-desc">Check connectivity, DNS, and internet access.</p>
          <button className="btn-primary" onClick={handleRunDiagnostics} disabled={diagRunning} style={{ marginTop: 8 }}>
            {diagRunning ? <><div className="spinner" /> Running…</> : 'Run Diagnostics'}
          </button>
          {diagError && <div className="error-banner" style={{ marginTop: 12 }}>{diagError}</div>}
        </div>

        <div className="general-section">
          <h3>🔄 Network Reboot</h3>
          <p className="toggle-desc">Reboot all nodes. Network offline for ~2 min.</p>
          {confirmReboot ? (
            <div className="confirm-inline" style={{ marginTop: 8 }}>
              <span>⚠️ Are you sure?</span>
              <button className="btn-confirm btn-danger" onClick={handleRebootNetwork} disabled={rebooting}>
                {rebooting ? 'Rebooting…' : 'Confirm'}
              </button>
              <button className="btn-cancel" onClick={() => setConfirmReboot(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-danger" onClick={() => setConfirmReboot(true)} style={{ marginTop: 8 }}>
              Reboot Entire Network
            </button>
          )}
        </div>
      </div>

      {/* Advanced — raw data collapsed */}
      <details className="general-advanced">
        <summary className="general-advanced-summary">Advanced Details</summary>
        <div className="general-advanced-body">
          {diagResult && (
            <div className="general-advanced-block">
              <h4>Last Diagnostics Result</h4>
              <pre className="json-preview">{JSON.stringify(diagResult, null, 2)}</pre>
            </div>
          )}
          {Object.keys(thread).length > 0 && (
            <div className="general-advanced-block">
              <h4>Thread</h4>
              <pre className="json-preview">{JSON.stringify(thread, null, 2)}</pre>
            </div>
          )}
          {Object.keys(routing).length > 0 && (
            <div className="general-advanced-block">
              <h4>Routing</h4>
              <pre className="json-preview">{JSON.stringify(routing, null, 2)}</pre>
            </div>
          )}
          {Object.keys(updates).length > 0 && (
            <div className="general-advanced-block">
              <h4>Firmware Details</h4>
              <pre className="json-preview">{JSON.stringify(updates, null, 2)}</pre>
            </div>
          )}
          {Object.keys(settings).length > 0 && (
            <div className="general-advanced-block">
              <h4>All Network Settings</h4>
              <pre className="json-preview">{JSON.stringify(settings, null, 2)}</pre>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
