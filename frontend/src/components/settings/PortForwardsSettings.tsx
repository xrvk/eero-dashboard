import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';

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
        <div className="section-header-inline mb-12">
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
                <td><input placeholder="192.168.x.x" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></td>
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
              <tr><td colSpan={6} className="empty-text" style={{ textAlign: 'center' }}>No port forwards</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
