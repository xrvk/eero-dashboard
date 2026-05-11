import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';

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
  const [dnsServers, setDnsServers] = useState(['', '']);
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
      const resp = await api.updateSecurity(networkId, { [apiKey || key]: value });
      await refetchSecurity();
      const actual = (resp as Record<string, unknown>)[key];
      if (typeof actual === 'boolean' && actual !== value) {
        alert(`${key} could not be changed — this may require eero Plus or compatible hardware.`);
      }
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
  const handleDnsSave = async () => {
    setDnsSaving(true);
    try {
      const servers = dnsMode === 'custom' ? dnsServers.map(s => s.trim()).filter(Boolean) : undefined;
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
    try {
      await api.setSqmEnabled(networkId, !sqmEnabled);
      await refetchSqm();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
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
            {!renaming && <button className="btn-icon-sm" onClick={() => { setNewName(networkName); setRenaming(true); }} title="Edit network name"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>}
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
              <button className="btn-icon-sm" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Hide' : 'Show'}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
              {password && (
                <button className="btn-icon-sm" onClick={handleCopy} title="Copy">
                  {copied ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  )}
                </button>
              )}
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

      {/* Security & Connectivity */}
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
            <div style={{ paddingLeft: 4 }}>
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
                    <button className="btn-text" onClick={() => { setUploadMbps(currentUpload ? String(currentUpload) : ''); setDownloadMbps(currentDownload ? String(currentDownload) : ''); setSqmEditMode(true); }}>Manual</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-name">
                Thread
                {(!!thread.name || !!thread.channel) && (
                  <span
                    className="thread-info-badge"
                    data-tip={[thread.name && `Network: ${thread.name}`, thread.channel && `Channel: ${thread.channel}`].filter(Boolean).join(' · ')}
                  >ℹ️</span>
                )}
              </span>
              <span className="toggle-desc">IoT mesh networking protocol</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={!!(security as Record<string, unknown>).thread} disabled={secSaving}
                onChange={() => handleSecurityToggle('thread', !(security as Record<string, unknown>).thread)} />
              <span className="toggle-slider" />
            </label>
          </div>
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
        <div style={{ marginTop: 12 }}>
          <label className="drawer-label">DNS Provider</label>
          <div className="dns-provider-row">
            <select
              className="dns-select"
              value={dnsEditing ? dnsMode : dnsCurrentMode}
              onChange={(e) => {
                const val = e.target.value;
                setDnsMode(val);
                if (val === 'custom') setDnsServers([customIps[0] || '', customIps[1] || '']);
                setDnsEditing(true);
              }}
              disabled={dnsSaving}
            >
              <option value="default">eero Default</option>
              <option value="cloudflare">Cloudflare (1.1.1.1)</option>
              <option value="google">Google (8.8.8.8)</option>
              <option value="opendns">OpenDNS (208.67.222.222)</option>
              <option value="custom">Custom</option>
            </select>
            {dnsEditing && dnsMode !== 'custom' && (
              <button className="btn-primary btn-sm" onClick={handleDnsSave} disabled={dnsSaving}>
                {dnsSaving ? '…' : 'Apply'}
              </button>
            )}
          </div>
        </div>

        {((dnsEditing && dnsMode === 'custom') || (!dnsEditing && dnsCurrentMode === 'custom')) && (
          <div className="dns-server-inputs">
            {['Primary', 'Secondary'].map((label, i) => (
              <div key={i} className="form-field">
                <label>{label} {i === 1 && '(optional)'}</label>
                <input
                  className="dns-input" type="text"
                  placeholder={i === 0 ? '1.1.1.1 or 2606:4700:4700::1111' : '8.8.8.8'}
                  value={dnsEditing ? dnsServers[i] : (customIps[i] || '')}
                  onFocus={() => { if (!dnsEditing) { setDnsMode('custom'); setDnsServers([customIps[0] || '', customIps[1] || '']); setDnsEditing(true); } }}
                  onChange={(e) => { const s = [...dnsServers]; s[i] = e.target.value; setDnsServers(s); if (!dnsEditing) { setDnsMode('custom'); setDnsEditing(true); } }}
                />
              </div>
            ))}
            {dnsEditing && (
              <div className="dns-edit-actions">
                <button className="btn-primary" onClick={handleDnsSave} disabled={dnsSaving}>{dnsSaving ? 'Saving…' : 'Save'}</button>
                <button className="btn-cancel" onClick={() => setDnsEditing(false)}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node Controls */}
      <NodeControlsSection networkId={networkId} />

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

// ── Node Controls (LED & Nightlight per node) ───────────

function extractId(url?: string) {
  if (!url) return '';
  return url.replace(/\/$/, '').split('/').pop() || '';
}

function NodeControlsSection({ networkId }: { networkId: string }) {
  const { data: eeroData } = useFetch(
    () => api.getEeros(networkId), [networkId], {}, `/networks/${networkId}/eeros`
  );
  const eeros = eeroData?.eeros ?? [];

  if (eeros.length === 0) return null;

  return (
    <div className="general-section">
      <h3>💡 Node Controls</h3>
      <p className="toggle-desc">Manage LED and nightlight settings for each node.</p>
      <div className="node-controls-list">
        {eeros.map((node, i) => {
          const eeroId = extractId(node.url);
          return (
            <NodeControlCard key={node.serial || i} networkId={networkId} eeroId={eeroId} node={node} index={i} />
          );
        })}
      </div>
    </div>
  );
}

function NodeControlCard({ networkId, eeroId, node, index }: {
  networkId: string; eeroId: string; node: api.EeroNode; index: number;
}) {
  const { data: ledData, refetch: refetchLed } = useFetch(
    () => api.getLedStatus(networkId, eeroId), [networkId, eeroId]
  );
  const { data: nightlightData, refetch: refetchNightlight } = useFetch(
    () => api.getNightlight(networkId, eeroId), [networkId, eeroId]
  );
  const [saving, setSaving] = useState(false);

  const led = (ledData as Record<string, unknown>) || {};
  const ledOn = !!led.led_on;
  const brightness = (led.brightness as number) ?? 100;

  const nlRaw = (nightlightData as Record<string, unknown>) || {};
  const nightlight = (nlRaw.nightlight as Record<string, unknown>) || null;

  const handleLedToggle = async () => {
    setSaving(true);
    try { await api.setLed(networkId, eeroId, !ledOn); await refetchLed(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleBrightness = async (value: number) => {
    setSaving(true);
    try { await api.setLedBrightness(networkId, eeroId, value); await refetchLed(); }
    catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleNightlightToggle = async () => {
    if (!nightlight) return;
    setSaving(true);
    try {
      await api.setNightlight(networkId, eeroId, { enabled: !(nightlight.enabled as boolean) });
      await refetchNightlight();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  const handleNightlightBrightness = async (value: number) => {
    setSaving(true);
    try {
      await api.setNightlight(networkId, eeroId, { brightness: value });
      await refetchNightlight();
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="node-control-card">
      <div className="node-control-header">
        <span className="node-control-icon">{node.gateway ? '🏠' : '📡'}</span>
        <div className="node-control-info">
          <span className="node-control-name">{node.location || `Node ${index + 1}`}</span>
          <span className="node-control-model">{node.model || 'eero'}</span>
        </div>
      </div>

      <div className="toggle-row">
        <div className="toggle-info">
          <span className="toggle-name">LED Light</span>
          <span className="toggle-desc">Status LED on this node</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={ledOn} disabled={saving} onChange={handleLedToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      {ledOn && (
        <div className="brightness-control">
          <label className="toggle-desc">LED Brightness</label>
          <div className="brightness-row">
            <input
              type="range" min="0" max="100" value={brightness}
              onChange={(e) => handleBrightness(Number(e.target.value))}
              disabled={saving} className="brightness-slider"
            />
            <span className="brightness-value">{brightness}%</span>
          </div>
        </div>
      )}

      {nightlight && (
        <>
          <div className="toggle-row" style={{ marginTop: 12 }}>
            <div className="toggle-info">
              <span className="toggle-name">Nightlight</span>
              <span className="toggle-desc">Ambient light on this node</span>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={!!(nightlight.enabled)} disabled={saving} onChange={handleNightlightToggle} />
              <span className="toggle-slider" />
            </label>
          </div>
          {nightlight.enabled && (
            <div className="brightness-control">
              <label className="toggle-desc">Nightlight Brightness</label>
              <div className="brightness-row">
                <input
                  type="range" min="0" max="100"
                  value={(nightlight.brightness as number) ?? 100}
                  onChange={(e) => handleNightlightBrightness(Number(e.target.value))}
                  disabled={saving} className="brightness-slider"
                />
                <span className="brightness-value">{(nightlight.brightness as number) ?? 100}%</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
