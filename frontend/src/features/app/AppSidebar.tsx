import { Smartphone, HeartPulse, User, Settings, ArrowDown, ArrowUp } from 'lucide-react';
import * as api from '../../api';
import type { AppTab } from './types';

interface AppSidebarProps {
  tab: AppTab;
  setTab: (tab: AppTab) => void;
  eeros: api.EeroNode[];
  networks: api.Network[];
  selectedNetwork: string | null;
  setSelectedNetwork: (networkId: string) => void;
  networkDetail: api.Network | null;
  auth: api.AuthStatus;
  onNavClick?: () => void;
  onNodeClick?: (eeroId: string, node: api.EeroNode) => void;
}

function getNetworkId(n: api.Network): string {
  if (n.id != null) return String(n.id);
  if (n.url) return n.url.replace(/\/$/, '').split('/').pop() || '';
  return '';
}

export default function AppSidebar({
  tab,
  setTab,
  eeros,
  networks,
  selectedNetwork,
  setSelectedNetwork,
  networkDetail,
  auth,
  onNavClick,
  onNodeClick,
}: AppSidebarProps) {
  const handleTab = (t: AppTab) => {
    setTab(t);
    onNavClick?.();
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
          <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.8" />
        </svg>
        <span>eero</span>
      </div>

      <nav className="sidebar-nav">
        <button className={`sidebar-item ${tab === 'devices' ? 'active' : ''}`} onClick={() => handleTab('devices')}>
          <span className="sidebar-icon"><Smartphone size={18} /></span> Devices
        </button>
        <button className={`sidebar-item ${tab === 'activity' ? 'active' : ''}`} onClick={() => handleTab('activity')}>
          <span className="sidebar-icon"><HeartPulse size={18} /></span> Health
        </button>
        <button className={`sidebar-item ${tab === 'profiles' ? 'active' : ''}`} onClick={() => handleTab('profiles')}>
          <span className="sidebar-icon"><User size={18} /></span> Profiles
        </button>
        <button
          className={`sidebar-item sidebar-section-parent ${tab.startsWith('settings-') ? 'active' : ''}`}
          onClick={() => handleTab('settings-general')}
        >
          <span className="sidebar-icon"><Settings size={18} /></span> Settings
        </button>
        <div className="sidebar-sub-items">
          <button className={`sidebar-item sidebar-sub ${tab === 'settings-general' ? 'active' : ''}`} onClick={() => handleTab('settings-general')}>
            General
          </button>
          <button className={`sidebar-item sidebar-sub ${tab === 'settings-forwards' ? 'active' : ''}`} onClick={() => handleTab('settings-forwards')}>
            Port Forwards
          </button>
          <button className={`sidebar-item sidebar-sub ${tab === 'settings-reservations' ? 'active' : ''}`} onClick={() => handleTab('settings-reservations')}>
            DHCP Reservations
          </button>
          <button className={`sidebar-item sidebar-sub ${tab === 'settings-guest' ? 'active' : ''}`} onClick={() => handleTab('settings-guest')}>
            Guest Network
          </button>
          <button className={`sidebar-item sidebar-sub ${tab === 'settings-blacklist' ? 'active' : ''}`} onClick={() => handleTab('settings-blacklist')}>
            Blacklist
          </button>
        </div>
      </nav>

      {eeros.length > 0 && (
        <div className="sidebar-nodes">
          <span className="sidebar-section-label">Nodes</span>
          {eeros.map((node: api.EeroNode, i: number) => {
            const eeroId = node.url ? node.url.replace(/\/$/, '').split('/').pop() || '' : '';
            return (
              <div
                key={node.serial || i}
                className="sidebar-node"
                onClick={() => onNodeClick?.(eeroId, node)}
                title="View node details"
              >
                <span className={`sidebar-node-dot status-dot-${node.status}`} />
                <div className="sidebar-node-info">
                  <span className="sidebar-node-name">{node.location || node.model || `Node ${i + 1}`}</span>
                  <span className="sidebar-node-meta">
                    {node.model}{node.connected_clients_count != null ? ` · ${node.connected_clients_count}` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {networks.length > 1 && (
        <div className="sidebar-networks">
          <span className="sidebar-section-label">Networks</span>
          {networks.map((n) => {
            const id = getNetworkId(n);
            return (
              <button
                key={id}
                className={`sidebar-item sidebar-net ${selectedNetwork === id ? 'active' : ''}`}
                onClick={() => setSelectedNetwork(id)}
              >
                {n.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="sidebar-footer">
        {networkDetail?.speed?.down && (
          <div className="sidebar-speed" title={networkDetail.speed.date ? new Date(networkDetail.speed.date).toLocaleString() : undefined}>
            <span className="sidebar-speed-label">Last Speed Test</span>
            <div className="sidebar-speed-gauges">
              <div className="sidebar-speed-gauge">
                <span className="sidebar-speed-arrow down"><ArrowDown size={12} /></span>
                <span className="sidebar-speed-val">{(networkDetail.speed.down as { value: number }).value.toFixed(0)}</span>
                <span className="sidebar-speed-unit">{(networkDetail.speed.down as { units: string }).units}</span>
              </div>
              {networkDetail.speed.up && (
                <div className="sidebar-speed-gauge">
                  <span className="sidebar-speed-arrow up"><ArrowUp size={12} /></span>
                  <span className="sidebar-speed-val">{(networkDetail.speed.up as { value: number }).value.toFixed(0)}</span>
                  <span className="sidebar-speed-unit">{(networkDetail.speed.up as { units: string }).units}</span>
                </div>
              )}
            </div>
            {networkDetail.speed.date && (
              <span className="sidebar-speed-date">{new Date(networkDetail.speed.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
            )}
          </div>
        )}
        {auth.name && <span className="sidebar-user">{auth.name}</span>}
      </div>
    </aside>
  );
}
