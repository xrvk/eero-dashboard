import { useState } from 'react';
import { Users, Eye, EyeOff, Pencil, Shield } from 'lucide-react';
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
            <div className="guest-enabled-layout">
              {/* Credential card */}
              <div className="guest-credential-card">
                <div className="guest-credential-header">
                  <div className="guest-credential-title">
                    <span className="general-card-icon">👥</span>
                    <h3>Guest Credentials</h3>
                  </div>
                  <button className="btn-icon-sm" onClick={startEditing} title="Edit credentials">
                    <Pencil size={16} />
                  </button>
                </div>

                <div className="guest-credential-fields">
                  <div className="guest-field">
                    <span className="guest-field-label">Network Name</span>
                    <span className="guest-field-value">{name || '—'}</span>
                  </div>
                  <div className="guest-field">
                    <span className="guest-field-label">Password</span>
                    <PasswordField value={password} />
                  </div>
                </div>
              </div>

              {/* Info strip */}
              <div className="guest-info-strip">
                <div className="guest-info-item">
                  <Shield size={14} />
                  <span>Isolated from your main network</span>
                </div>
                <div className="guest-info-item">
                  <Users size={14} />
                  <span>Guests cannot see your devices</span>
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
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <span className="password-field">
      <span
        className={`password-value mono ${value ? 'password-clickable' : ''} ${copied ? 'password-copied' : ''}`}
        onClick={handleCopy}
        title={value ? 'Click to copy' : undefined}
      >
        {copied ? 'Copied!' : visible ? value : '••••••••'}
      </span>
      <button className="btn-icon-sm" onClick={() => setVisible(!visible)} title={visible ? 'Hide' : 'Show'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}

