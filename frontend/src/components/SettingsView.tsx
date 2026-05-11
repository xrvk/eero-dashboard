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
  ];

  return (
    <div className="settings-page">
      <div className="settings-card">
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
  const caching = dns?.caching as boolean | undefined;

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
    <div className="settings-page">
      <div className="settings-card">
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-name">DNS Caching</span>
            <span className="toggle-desc">Cache DNS lookups locally for faster resolution</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={!!caching} disabled={saving} onChange={handleCachingToggle} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="settings-card">
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
            {customIps.length > 0 ? (
              <div className="dns-servers">
                <div className="dns-server-list">
                  {customIps.map((ip, i) => (
                    <span key={i} className="dns-server-chip">{ip}</span>
                  ))}
                </div>
              </div>
            ) : (
              <span className="dns-value" style={{ color: 'var(--text-muted)' }}>Using eero default DNS</span>
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
    <div className="settings-page">
      <div className="settings-card">
        <div className="section-header-inline" style={{ marginBottom: 12 }}>
          <span className="results-counter">{(list as unknown[]).length} forward{(list as unknown[]).length !== 1 ? 's' : ''}</span>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Add'}
          </button>
        </div>
        <table className="device-table">
          <thead>
            <tr><th>Ext. Port</th><th>Int. Port</th><th>Protocol</th><th>Device IP</th><th>Desc</th><th></th></tr>
          </thead>
          <tbody>
            {showForm && (
              <tr className="form-row">
                <td><input type="number" placeholder="80" value={form.gateway_port} onChange={e => setForm({ ...form, gateway_port: e.target.value })} /></td>
                <td><input type="number" placeholder="80" value={form.client_port} onChange={e => setForm({ ...form, client_port: e.target.value })} /></td>
                <td><select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}><option value="tcp">TCP</option><option value="udp">UDP</option><option value="tcp_udp">Both</option></select></td>
                <td><input placeholder="192.168.86.x" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></td>
                <td><input placeholder="label" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></td>
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
                  <td className="td-mono">{String(f.ip ?? '—')}</td>
                  <td>{String(f.description ?? '—')}</td>
                  <td>
                    <button className={`btn-action btn-delete ${confirmDelete === fid ? 'confirming' : ''}`}
                      disabled={deleting === fid} onClick={() => handleDelete(String(f.url || ''))}
                    >{confirmDelete === fid ? 'Confirm?' : '✕'}</button>
                  </td>
                </tr>
              );
            })}
            {(list as unknown[]).length === 0 && !showForm && (
              <tr><td colSpan={6} className="empty-text" style={{ textAlign: 'center', padding: 20 }}>No port forwards</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
    <div className="settings-page">
      <div className="settings-card">
        <div className="section-header-inline" style={{ marginBottom: 12 }}>
          <span className="results-counter">{(list as unknown[]).length} reservation{(list as unknown[]).length !== 1 ? 's' : ''}</span>
          <button className="btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Add'}
          </button>
        </div>
        <table className="device-table">
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
                  <td className="td-mono">{String(r.ip ?? '—')}</td>
                  <td className="td-mono">{String(r.mac ?? '—')}</td>
                  <td>{String(r.description ?? r.hostname ?? r.nickname ?? '—')}</td>
                  <td>
                    <button className={`btn-action btn-delete ${confirmDelete === rid ? 'confirming' : ''}`}
                      disabled={deleting === rid}
                      onClick={() => handleDelete(String(r.url || ''))}
                    >{confirmDelete === rid ? 'Confirm?' : '✕'}</button>
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
    <div className="settings-page">
      <div className="settings-card">
        <div className="toggle-row">
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
            <div className="dns-grid" style={{ marginBottom: 16, marginTop: 16 }}>
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
    <div className="settings-page">
      <div className="settings-card">
        <p className="toggle-desc" style={{ marginBottom: 16 }}>
          Permanently blocked devices cannot reconnect until removed.
        </p>

        {(blacklist as Record<string, unknown>[]).length > 0 ? (
          <table className="device-table">
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
                        {confirmRemove === did ? 'Confirm?' : '✕'}
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
    </div>
  );
}

// ── General Settings ────────────────────────────────

export function GeneralSettings({ networkId }: { networkId: string }) {
  const { data: settingsData, loading: sLoading, error: sError } = useFetch(
    () => api.getSettings(networkId), [networkId], {}, `/networks/${networkId}/settings`
  );
  const { data: passwordData, loading: pLoading } = useFetch(
    () => api.getPassword(networkId), [networkId], {}, `/networks/${networkId}/password`
  );
  const { data: updatesData, loading: uLoading } = useFetch(
    () => api.getUpdates(networkId), [networkId], {}, `/networks/${networkId}/updates`
  );
  const { data: threadData, loading: tLoading } = useFetch(
    () => api.getThread(networkId), [networkId], {}, `/networks/${networkId}/thread`
  );
  const { loading: rLoading } = useFetch(
    () => api.getRouting(networkId), [networkId], {}, `/networks/${networkId}/routing`
  );
  const { data: securityData, loading: secLoading, refetch: refetchSecurity } = useFetch(
    () => api.getSecurity(networkId), [networkId], {}, `/networks/${networkId}/security`
  );
  const { data: dnsData, loading: dnsLoading, refetch: refetchDns } = useFetch(
    () => api.getDns(networkId), [networkId], {}, `/networks/${networkId}/dns`
  );
  const { data: sqmData, loading: sqmLoading, refetch: refetchSqm } = useFetch(
    () => api.getSqm(networkId), [networkId], {}, `/networks/${networkId}/sqm`
  );
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [diagRunning, setDiagRunning] = useState(false);
  const [diagError, setDiagError] = useState('');
  const [rebooting, setRebooting] = useState(false);
  const [confirmReboot, setConfirmReboot] = useState(false);
  const [secSaving, setSecSaving] = useState(false);
  const [dnsEditing, setDnsEditing] = useState(false);
  const [dnsMode, setDnsMode] = useState('');
  const [customServers, setCustomServers] = useState('');
  const [dnsSaving, setDnsSaving] = useState(false);
  const [sqmSaving, setSqmSaving] = useState(false);
  const [sqmEditMode, setSqmEditMode] = useState(false);
  const [uploadMbps, setUploadMbps] = useState('');
  const [downloadMbps, setDownloadMbps] = useState('');

  const isLoading = sLoading && pLoading && uLoading && tLoading && rLoading && secLoading && dnsLoading && sqmLoading;
  if (isLoading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (sError) return <div className="card error-card">Error: {sError}</div>;

  const settings = (settingsData ?? {}) as api.NetworkSettingsSummary;
  const pw = passwordData as Record<string, unknown> || {};
  const password = String(pw.password || pw.key || '');
  const networkName = String(settings.name || '');
  const updates = updatesData as Record<string, unknown> || {};
  const thread = threadData as Record<string, unknown> || {};
  const security = securityData || {} as Record<string, unknown>;
  const wanIp = String(settings.wan_ip || '');
  const gatewayIp = String(settings.gateway_ip || '');
  const timezone = typeof settings.timezone === 'string' ? settings.timezone : (settings.timezone?.value || '');

  // DNS
  const dns = (dnsData as Record<string, unknown>)?.dns as Record<string, unknown> | undefined;
  const dnsCurrentMode = dns?.mode as string || 'default';
  const customIps = (dns?.custom as { ips?: string[] })?.ips ?? [];
  const dnsCaching = dns?.caching as boolean | undefined;

  // SQM
  const sqm = sqmData as Record<string, unknown> || {};
  const sqmEnabled = !!sqm.enabled;
  const sqmMode = (sqm.mode as string) || 'auto';
  const currentUpload = sqm.upload_bandwidth_mbps as number | undefined;
  const currentDownload = sqm.download_bandwidth_mbps as number | undefined;

  const securityToggles: { key: string; label: string; desc: string; apiKey?: string }[] = [
    { key: 'wpa3', label: 'WPA3', desc: 'Latest WiFi security protocol' },
    { key: 'band_steering', label: 'Band Steering', desc: 'Auto-assign devices to optimal band' },
    { key: 'upnp', label: 'UPnP', desc: 'Allow devices to open ports automatically' },
    { key: 'ipv6_upstream', label: 'IPv6', desc: 'Enable IPv6 networking', apiKey: 'ipv6' },
  ];

  const handleSecurityToggle = async (key: string, value: boolean, apiKey?: string) => {
    setSecSaving(true);
    try {
      await api.updateSecurity(networkId, { [apiKey || key]: value });
      await refetchSecurity();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSecSaving(false); }
  };

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
    try { await api.runDiagnostics(networkId); }
    catch (e) { setDiagError(e instanceof Error ? e.message : 'Failed'); }
    finally { setDiagRunning(false); }
  };

  const handleRebootNetwork = async () => {
    setRebooting(true);
    try { await api.rebootNetwork(networkId); setConfirmReboot(false); }
    catch (e) { alert(e instanceof Error ? e.message : 'Reboot failed'); }
    finally { setRebooting(false); }
  };

  // DNS handlers
  const startDnsEdit = () => {
    setDnsMode(dnsCurrentMode);
    setCustomServers(customIps.join(', '));
    setDnsEditing(true);
  };
  const handleDnsSave = async () => {
    setDnsSaving(true);
    try {
      const servers = dnsMode === 'custom' ? customServers.split(/[,\s]+/).map(s => s.trim()).filter(Boolean) : undefined;
      await api.setDnsMode(networkId, dnsMode, servers);
      await refetchDns();
      setDnsEditing(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDnsSaving(false); }
  };
  const handleCachingToggle = async () => {
    setDnsSaving(true);
    try { await api.setDnsCaching(networkId, !dnsCaching); await refetchDns(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setDnsSaving(false); }
  };

  // SQM handlers
  const handleSqmToggle = async () => {
    setSqmSaving(true);
    try { await api.setSqmEnabled(networkId, !sqmEnabled); await refetchSqm(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSqmSaving(false); }
  };
  const handleSqmAuto = async () => {
    setSqmSaving(true);
    try { await api.setSqmAuto(networkId); await refetchSqm(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSqmSaving(false); }
  };
  const handleSqmSave = async () => {
    setSqmSaving(true);
    try {
      await api.configureSqm(networkId, true, uploadMbps ? Number(uploadMbps) : undefined, downloadMbps ? Number(downloadMbps) : undefined);
      await refetchSqm();
      setSqmEditMode(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSqmSaving(false); }
  };

  return (
    <div className="general-settings">
      {/* Top cards row */}
      <div className="general-cards">
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
              <button className="btn-primary btn-sm" onClick={handleRename} disabled={saving}>{saving ? '…' : '✓'}</button>
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

        <div className="general-card">
          <div className="general-card-header">
            <span className="general-card-icon">🔑</span>
            <h3>Wi-Fi Password</h3>
          </div>
          <div className="general-password">
            <span className="general-card-value mono">{showPassword ? password : '••••••••••'}</span>
            <div className="general-password-actions">
              <button className="btn-icon-sm" onClick={() => setShowPassword(!showPassword)}>{showPassword ? '🙈' : '👁️'}</button>
              {password && <button className="btn-icon-sm" onClick={handleCopy}>{copied ? '✅' : '📋'}</button>}
            </div>
          </div>
        </div>

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
              </div>
            </>
          ) : (
            <span className="empty-text">No firmware info</span>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="general-section">
        <h3>🔒 Security & Connectivity</h3>
        <div className="toggle-list">
          {securityToggles.map((t) => {
            const val = (security as Record<string, unknown>)[t.key];
            const isOn = typeof val === 'boolean' ? val : !!val;
            return (
              <div key={t.key} className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-name">{t.label}</span>
                  <span className="toggle-desc">{t.desc}</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={isOn} disabled={secSaving}
                    onChange={() => handleSecurityToggle(t.key, !isOn, t.apiKey)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {/* DNS */}
      <div className="general-section">
        <h3>🌐 DNS</h3>
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-name">DNS Caching</span>
            <span className="toggle-desc">Cache lookups locally for faster resolution</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={!!dnsCaching} disabled={dnsSaving} onChange={handleCachingToggle} />
            <span className="toggle-slider" />
          </label>
        </div>
        {dnsEditing ? (
          <div className="dns-edit-form" style={{ marginTop: 16 }}>
            <div className="dns-mode-select">
              <label className={`dns-mode-option ${dnsMode === 'default' ? 'selected' : ''}`}>
                <input type="radio" name="dns-mode" value="default" checked={dnsMode === 'default'} onChange={() => setDnsMode('default')} />
                <div><span className="dns-mode-label">Default</span><span className="dns-mode-desc">Use eero's DNS</span></div>
              </label>
              <label className={`dns-mode-option ${dnsMode === 'custom' ? 'selected' : ''}`}>
                <input type="radio" name="dns-mode" value="custom" checked={dnsMode === 'custom'} onChange={() => setDnsMode('custom')} />
                <div><span className="dns-mode-label">Custom</span><span className="dns-mode-desc">Use your own DNS</span></div>
              </label>
            </div>
            {dnsMode === 'custom' && (
              <div style={{ marginTop: 12 }}>
                <label className="dns-input-label">DNS Server IPs (comma separated)</label>
                <input className="dns-input" type="text" placeholder="192.168.86.5, 1.1.1.1" value={customServers} onChange={(e) => setCustomServers(e.target.value)} />
              </div>
            )}
            <div className="dns-edit-actions">
              <button className="btn-primary" onClick={handleDnsSave} disabled={dnsSaving}>{dnsSaving ? 'Saving…' : 'Save'}</button>
              <button className="btn-cancel" onClick={() => setDnsEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="general-info-grid" style={{ marginTop: 12 }}>
            <div className="general-detail">
              <span>DNS Servers</span>
              <span>{customIps.length > 0 ? customIps.join(', ') : 'eero Default'} <button className="btn-text" onClick={startDnsEdit}>✏️</button></span>
            </div>
          </div>
        )}
      </div>

      {/* QoS / SQM */}
      <div className="general-section">
        <h3>🚀 QoS (Smart Queue Management)</h3>
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-name">SQM</span>
            <span className="toggle-desc">Reduce bufferbloat for gaming, video calls, streaming</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={sqmEnabled} disabled={sqmSaving} onChange={handleSqmToggle} />
            <span className="toggle-slider" />
          </label>
        </div>
        {sqmEnabled && (
          <div style={{ marginTop: 12 }}>
            {sqmEditMode ? (
              <div className="sqm-edit-form">
                <div className="form-field">
                  <label>Upload (Mbps)</label>
                  <input type="number" value={uploadMbps} onChange={(e) => setUploadMbps(e.target.value)} placeholder="e.g. 50" min="1" />
                </div>
                <div className="form-field">
                  <label>Download (Mbps)</label>
                  <input type="number" value={downloadMbps} onChange={(e) => setDownloadMbps(e.target.value)} placeholder="e.g. 500" min="1" />
                </div>
                <div className="dns-edit-actions">
                  <button className="btn-primary" onClick={handleSqmSave} disabled={sqmSaving}>{sqmSaving ? 'Saving…' : 'Save'}</button>
                  <button className="btn-cancel" onClick={() => setSqmEditMode(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="general-card-details">
                <div className="general-detail"><span>Mode</span><span>{sqmMode}</span></div>
                {currentUpload != null && <div className="general-detail"><span>Upload</span><span>{currentUpload} Mbps</span></div>}
                {currentDownload != null && <div className="general-detail"><span>Download</span><span>{currentDownload} Mbps</span></div>}
                <div className="sqm-mode-buttons" style={{ marginTop: 8 }}>
                  <button className="btn-primary btn-sm" onClick={handleSqmAuto} disabled={sqmSaving}>Auto Optimize</button>
                  <button className="btn-text" onClick={() => { setUploadMbps(currentUpload ? String(currentUpload) : ''); setDownloadMbps(currentDownload ? String(currentDownload) : ''); setSqmEditMode(true); }}>✏️ Manual</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thread */}
      <div className="general-section">
        <h3>🧵 Thread</h3>
        <div className="toggle-row">
          <div className="toggle-info">
            <span className="toggle-name">Thread</span>
            <span className="toggle-desc">IoT mesh networking protocol</span>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={!!(security as Record<string, unknown>).thread} disabled={secSaving}
              onChange={() => handleSecurityToggle('thread', !(security as Record<string, unknown>).thread)} />
            <span className="toggle-slider" />
          </label>
        </div>
        {(!!thread.name || !!thread.channel) && (
          <div className="general-info-grid" style={{ marginTop: 12 }}>
            {!!thread.name && <div className="general-detail"><span>Network</span><span className="mono">{String(thread.name)}</span></div>}
            {!!thread.channel && <div className="general-detail"><span>Channel</span><span>{String(thread.channel)}</span></div>}
          </div>
        )}
      </div>

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
              <button className="btn-confirm btn-danger" onClick={handleRebootNetwork} disabled={rebooting}>{rebooting ? 'Rebooting…' : 'Confirm'}</button>
              <button className="btn-cancel" onClick={() => setConfirmReboot(false)}>Cancel</button>
            </div>
          ) : (
            <button className="btn-danger" onClick={() => setConfirmReboot(true)} style={{ marginTop: 8 }}>Reboot Entire Network</button>
          )}
        </div>
      </div>
    </div>
  );
}
