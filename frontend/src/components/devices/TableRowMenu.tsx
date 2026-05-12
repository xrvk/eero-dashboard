import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Device } from '../../api';

interface TableRowMenuProps {
  device: Device;
  actionLoading: string | null;
  onAction: (mac: string, type: 'pause' | 'block') => void;
  onRename: (mac: string, currentName: string) => void;
  onReserve: () => void;
}

export default function TableRowMenu({ device: d, actionLoading, onAction, onRename, onReserve }: TableRowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="card-menu-wrapper" ref={ref}>
      <button className="btn-menu" onClick={() => setOpen(!open)} title="Actions"><MoreHorizontal size={16} /></button>
      {open && (
        <div className="card-menu">
          <button className="card-menu-item" onClick={() => { setOpen(false); onRename(d.mac!, d.display_name || d.hostname || ''); }}>
            Rename
          </button>
          <button className="card-menu-item" onClick={() => { setOpen(false); onReserve(); }}>
            Reserve IP
          </button>
          <button className="card-menu-item" disabled={actionLoading === d.mac} onClick={() => { setOpen(false); onAction(d.mac!, 'pause'); }}>
            Pause Internet
          </button>
          <button className="card-menu-item danger" disabled={actionLoading === d.mac} onClick={() => { setOpen(false); onAction(d.mac!, 'block'); }}>
            Block Device
          </button>
        </div>
      )}
    </div>
  );
}
