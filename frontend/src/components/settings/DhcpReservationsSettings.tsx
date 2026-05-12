import { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import * as api from '../../api';

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
        <div className="section-header-inline mb-12">
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
                <td><input placeholder="192.168.x.x" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} /></td>
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
              <tr><td colSpan={4} className="empty-text" style={{ textAlign: 'center' }}>No DHCP reservations</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
