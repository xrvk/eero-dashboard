import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';

export function DnsSettings({ networkId }: { networkId: string }) {
  const { data, loading, error, refetch } = useFetch(
    () => api.getDns(networkId), [networkId]
  );
  const [editing, setEditing] = useState(false);
  const [dnsMode, setDnsMode] = useState('');
  const [dnsServers, setDnsServers] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const dns = (data as Record<string, unknown>)?.dns as Record<string, unknown> | undefined;
  const mode = dns?.mode as string || 'default';
  const customIps = (dns?.custom as { ips?: string[] })?.ips ?? [];
  const caching = dns?.caching as boolean | undefined;


  const handleSave = async () => {
    setSaving(true);
    try {
      const servers = dnsMode === 'custom'
        ? dnsServers.map(s => s.trim()).filter(Boolean)
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
            <button className="btn-icon-sm" onClick={() => setEditing(true)} title="Edit DNS"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          )}
        </div>

        {((editing && dnsMode === 'custom') || (!editing && mode === 'custom')) && (
          <div className="dns-server-inputs">
            {['Primary', 'Secondary'].map((label, i) => (
              <div key={i} className="form-field">
                <label>{label} {i === 1 && '(optional)'}</label>
                <input
                  className="dns-input" type="text"
                  placeholder={i === 0 ? '1.1.1.1 or 2606:4700:4700::1111' : '8.8.8.8'}
                  value={editing ? dnsServers[i] : (customIps[i] || '')}
                  onFocus={() => { if (!editing) { setDnsMode('custom'); setDnsServers([customIps[0] || '', customIps[1] || '']); setEditing(true); } }}
                  onChange={(e) => { const s = [...dnsServers]; s[i] = e.target.value; setDnsServers(s); if (!editing) { setDnsMode('custom'); setEditing(true); } }}
                />
              </div>
            ))}
            {editing && (
              <div className="dns-edit-actions">
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
