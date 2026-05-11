import { useState, useEffect, useRef } from 'react';

export default function InlineEditName({ value, onSave }: { value: string; onSave: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <h3
        className="profile-detail-name editable"
        onClick={() => setEditing(true)}
        title="Click to rename"
      >
        {value}
        <span className="edit-hint">✎</span>
      </h3>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className="inline-edit-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') { setDraft(value); setEditing(false); }
      }}
      maxLength={50}
    />
  );
}
