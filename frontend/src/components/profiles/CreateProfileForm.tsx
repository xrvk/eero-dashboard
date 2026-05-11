import { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import * as api from '../../api';

export default function CreateProfileForm({
  networkId,
  onCreated,
  onCancel,
}: {
  networkId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.createProfile(networkId, name.trim());
      onCreated();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create profile');
      setSaving(false);
    }
  };

  return (
    <form className="create-profile-form" onSubmit={handleSubmit}>
      <div className="create-profile-icon"><User size={20} /></div>
      <input
        ref={inputRef}
        type="text"
        className="create-profile-input"
        placeholder="Profile name…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
        disabled={saving}
        maxLength={50}
      />
      <button
        type="submit"
        className="btn-sm btn-primary"
        disabled={saving || !name.trim()}
      >
        {saving ? 'Creating…' : 'Create'}
      </button>
      <button
        type="button"
        className="btn-sm"
        onClick={onCancel}
        disabled={saving}
      >
        Cancel
      </button>
    </form>
  );
}
