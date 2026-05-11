import { useState, useMemo } from 'react';
import * as api from '../../api';

export default function DevicePicker({ networkId, profileId, currentDeviceUrls, allDevices, onSaved }: {
  networkId: string;
  profileId: string;
  currentDeviceUrls: string[];
  allDevices: api.Device[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(currentDeviceUrls.filter(Boolean)));
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return allDevices;
    const q = search.toLowerCase();
    return allDevices.filter(d => {
      const name = (d.display_name || d.hostname || '').toLowerCase();
      const mac = (d.mac || '').toLowerCase();
      return name.includes(q) || mac.includes(q);
    });
  }, [allDevices, search]);

  const toggle = (url: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setProfileDevices(networkId, profileId, [...selected]);
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update devices');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (() => {
    const orig = new Set(currentDeviceUrls.filter(Boolean));
    if (orig.size !== selected.size) return true;
    for (const u of selected) if (!orig.has(u)) return true;
    return false;
  })();

  return (
    <div className="device-picker">
      <input
        type="text"
        className="picker-search"
        placeholder="Search devices…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="picker-list">
        {filtered.map((d) => {
          const url = d.url || '';
          const isSelected = selected.has(url);
          return (
            <label key={d.mac || url} className={`picker-item ${isSelected ? 'selected' : ''}`}>
              <input type="checkbox" checked={isSelected} onChange={() => toggle(url)} />
              <span className="picker-name">{d.display_name || d.hostname || d.mac || 'Unknown'}</span>
              {d.connected && <span className="picker-online">●</span>}
            </label>
          );
        })}
      </div>
      <div className="picker-actions">
        <span className="picker-count">{selected.size} selected</span>
        <button className="btn-primary" onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
