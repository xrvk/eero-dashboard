import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';

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
                  Set Manual Limits
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
