import { useState } from 'react';
import { Users } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import * as api from '../api';

interface GuestNetworkProps {
  networkId: string;
}

export default function GuestNetwork({ networkId }: GuestNetworkProps) {
  const { data: networkData, loading, error, refetch } = useFetch(
    () => api.getNetwork(networkId),
    [networkId]
  );
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPassword, setGuestPassword] = useState('');

  if (loading) return <div className="card loading-card"><div className="spinner" /> Loading…</div>;
  if (error) return <div className="card error-card">Error: {error}</div>;

  const guest = (networkData as Record<string, unknown>)?.guest_network as Record<string, unknown> | undefined;
  const enabled = !!guest?.enabled;
  const name = (guest?.name as string) || '';
  const password = (guest?.password as string) || '';

  const handleToggle = async () => {
    setSaving(true);
    try {
      await api.setGuestNetwork(networkId, !enabled);
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed';
      if (msg.includes('404')) {
        alert('Guest network toggle is not supported on this network — this may require eero Plus or compatible hardware.');
      } else {
        alert(msg);
      }
    }
    finally { setSaving(false); }
  };

  const startEditing = () => {
    setGuestName(name);
    setGuestPassword(password);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setGuestNetwork(
        networkId,
        true,
        guestName.trim() || undefined,
        guestPassword.trim() || undefined
      );
      await refetch();
      setEditing(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="guest-network">
      <div className="toggle-row" style={{ marginBottom: 20 }}>
        <div className="toggle-info">
          <span className="toggle-name">Guest Network</span>
          <span className="toggle-desc">Allow guests to connect without sharing your main password</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} disabled={saving} onChange={handleToggle} />
          <span className="toggle-slider" />
        </label>
      </div>

      {enabled && (
        <div className="guest-details">
          {editing ? (
            <div className="guest-edit-form">
              <div className="form-field">
                <label>Network Name (SSID)</label>
                <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
                  placeholder="Guest Network" />
              </div>
              <div className="form-field">
                <label>Password</label>
                <input type="text" value={guestPassword} onChange={(e) => setGuestPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }}
                  placeholder="Enter password" />
              </div>
              <div className="dns-edit-actions">
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="guest-info-card">
              <div className="section-header-inline">
                <h3>Guest Credentials</h3>
                <button className="btn-icon-sm" onClick={startEditing} title="Edit credentials"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              </div>
              <div className="dns-grid">
                <div className="dns-item">
                  <span className="dns-label">SSID</span>
                  <span className="dns-value">{name || '—'}</span>
                </div>
                <div className="dns-item">
                  <span className="dns-label">Password</span>
                  <PasswordField value={password} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!enabled && (
        <div className="empty-state" style={{ marginTop: 20 }}>
          <p className="empty-icon"><Users size={40} /></p>
          <p className="empty-text">Guest network is disabled</p>
          <p className="empty-hint">Enable it to let guests connect without sharing your main password</p>
        </div>
      )}
    </div>
  );
}

function PasswordField({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <span className="password-field">
      <span className="password-value mono">{visible ? value : '••••••••'}</span>
      <button className="btn-icon-sm" onClick={() => setVisible(!visible)} title={visible ? 'Hide' : 'Show'}>
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        )}
      </button>
      {value && (
        <button className="btn-icon-sm" onClick={handleCopy} title="Copy">
          {copied ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          )}
        </button>
      )}
    </span>
  );
}
