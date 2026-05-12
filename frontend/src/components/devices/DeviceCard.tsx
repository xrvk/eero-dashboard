import { useState, useRef, useEffect } from 'react';
import { Wifi, Cable, MoreHorizontal } from 'lucide-react';
import type { Device } from '../../api';
import { getDeviceIcon, getConn, freqToBand } from './utils';

interface DeviceCardProps {
  device: Device;
  actionLoading: string | null;
  onAction: (mac: string, type: 'pause' | 'block') => void;
  onRename: (mac: string, currentName: string) => void;
  onReserve: () => void;
  onClick: () => void;
}

export default function DeviceCard({ device: d, actionLoading, onAction, onRename, onReserve, onClick }: DeviceCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const conn = getConn(d);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className={`device-card ${d.connected ? 'connected' : 'offline'}`} onClick={onClick}>
      <div className="device-icon">{getDeviceIcon(d)}</div>
      <div className="device-info">
        <span className="device-name">{d.display_name || d.hostname || 'Unknown'}</span>
        <span className="device-meta">{d.ip || d.mac}</span>
        {d.connection_type && (
          <span className="device-connection">
            {d.wireless ? <Wifi size={14} /> : <Cable size={14} />} {d.connection_type}
            {d.wireless && conn?.frequency ? ` · ${freqToBand(conn.frequency)}` : ''}
          </span>
        )}
      </div>
      <div className="card-right" onClick={(e) => e.stopPropagation()}>
        {d.connected && (
          <div className="card-menu-wrapper" ref={menuRef}>
            <button
              className="btn-menu"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Actions"
            ><MoreHorizontal size={16} /></button>
            {menuOpen && (
              <div className="card-menu">
                <button
                  className="card-menu-item"
                  onClick={() => { setMenuOpen(false); onRename(d.mac!, d.display_name || d.hostname || ''); }}
                >
                  Rename
                </button>
                <button
                  className="card-menu-item"
                  onClick={() => { setMenuOpen(false); onReserve(); }}
                >
                  Reserve IP
                </button>
                <button
                  className="card-menu-item"
                  disabled={actionLoading === d.mac}
                  onClick={() => { setMenuOpen(false); onAction(d.mac!, 'pause'); }}
                >
                  Pause Internet
                </button>
                <button
                  className="card-menu-item danger"
                  disabled={actionLoading === d.mac}
                  onClick={() => { setMenuOpen(false); onAction(d.mac!, 'block'); }}
                >
                  Block Device
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
