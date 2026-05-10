import { useState, useEffect, useCallback } from 'react';
import * as api from './api';
import { useFetch } from './hooks/useFetch';
import LoginForm from './components/LoginForm';
import DeviceList from './components/DeviceList';
import ActivityView from './components/ActivityView';
import ProfileManager from './components/ProfileManager';
import { SecuritySettings, DnsSettings, PortForwardsSettings, DhcpReservationsSettings, DiagnosticsSettings } from './components/SettingsView';

function getNetworkId(n: api.Network): string {
  if (n.id != null) return String(n.id);
  if (n.url) return n.url.replace(/\/$/, '').split('/').pop() || '';
  return '';
}

export default function App() {
  const [auth, setAuth] = useState<api.AuthStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [networks, setNetworks] = useState<api.Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [networkDetail, setNetworkDetail] = useState<api.Network | null>(null);
  const [tab, setTab] = useState<'devices' | 'activity' | 'profiles' | 'settings-security' | 'settings-dns' | 'settings-forwards' | 'settings-reservations' | 'settings-diagnostics'>('devices');
  const settingsOpen = tab.startsWith('settings-');

  const checkAuth = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setAuth(status);
      if (status.authenticated) {
        const res = await api.getNetworks();
        setNetworks(res.networks);
        if (res.networks.length > 0 && !selectedNetwork) {
          const id = getNetworkId(res.networks[0]);
          setSelectedNetwork(id);
        }
      }
    } catch {
      setAuth({ authenticated: false });
    } finally {
      setChecking(false);
    }
  }, [selectedNetwork]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useEffect(() => {
    if (!selectedNetwork) return;
    api.getNetwork(selectedNetwork).then(setNetworkDetail).catch(() => {});
  }, [selectedNetwork]);

  const handleLogout = async () => {
    await api.logout();
    setAuth({ authenticated: false });
    setNetworks([]);
    setSelectedNetwork(null);
    setNetworkDetail(null);
  };

  // Fetch eero nodes for sidebar display
  const { data: eeroData } = useFetch(
    () => selectedNetwork ? api.getEeros(selectedNetwork) : Promise.resolve({ eeros: [] }),
    [selectedNetwork]
  );
  const eeros = eeroData?.eeros ?? [];

  if (checking) {
    return (
      <div className="app-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!auth?.authenticated) {
    return <LoginForm onAuthenticated={checkAuth} />;
  }

  return (
    <div className="app">
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
          <button className={`sidebar-item ${tab === 'devices' ? 'active' : ''}`} onClick={() => setTab('devices')}>
            <span className="sidebar-icon">📱</span> Devices
          </button>
          <button className={`sidebar-item ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>
            <span className="sidebar-icon">💚</span> Health
          </button>
          <button className={`sidebar-item ${tab === 'profiles' ? 'active' : ''}`} onClick={() => setTab('profiles')}>
            <span className="sidebar-icon">👤</span> Profiles
          </button>
          <button
            className={`sidebar-item ${settingsOpen ? 'active' : ''}`}
            onClick={() => setTab(settingsOpen ? 'devices' : 'settings-security')}
          >
            <span className="sidebar-icon">⚙️</span> Settings
            <span className="sidebar-expand-icon">{settingsOpen ? '▾' : '▸'}</span>
          </button>
          {settingsOpen && (
            <div className="sidebar-sub-items">
              <button className={`sidebar-item sidebar-sub ${tab === 'settings-security' ? 'active' : ''}`} onClick={() => setTab('settings-security')}>
                Security
              </button>
              <button className={`sidebar-item sidebar-sub ${tab === 'settings-dns' ? 'active' : ''}`} onClick={() => setTab('settings-dns')}>
                DNS
              </button>
              <button className={`sidebar-item sidebar-sub ${tab === 'settings-forwards' ? 'active' : ''}`} onClick={() => setTab('settings-forwards')}>
                Port Forwards
              </button>
              <button className={`sidebar-item sidebar-sub ${tab === 'settings-reservations' ? 'active' : ''}`} onClick={() => setTab('settings-reservations')}>
                DHCP Reservations
              </button>
              <button className={`sidebar-item sidebar-sub ${tab === 'settings-diagnostics' ? 'active' : ''}`} onClick={() => setTab('settings-diagnostics')}>
                Diagnostics
              </button>
            </div>
          )}
        </nav>

        {eeros.length > 0 && (
          <div className="sidebar-nodes">
            <span className="sidebar-section-label">Nodes</span>
            {eeros.map((node: api.EeroNode, i: number) => (
              <div key={node.serial || i} className="sidebar-node">
                <span className={`sidebar-node-dot status-dot-${node.status}`} />
                <div className="sidebar-node-info">
                  <span className="sidebar-node-name">{node.location || node.model || `Node ${i + 1}`}</span>
                  <span className="sidebar-node-meta">
                    {node.model}{node.connected_clients_count != null ? ` · ${node.connected_clients_count}` : ''}
                  </span>
                </div>
              </div>
            ))}
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
          {auth.name && <span className="sidebar-user">{auth.name}</span>}
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-header">
          <h1>{
            tab === 'devices' ? 'Devices' :
            tab === 'activity' ? 'Network Health' :
            tab === 'profiles' ? 'Profiles' :
            tab === 'settings-security' ? 'Security' :
            tab === 'settings-dns' ? 'DNS' :
            tab === 'settings-forwards' ? 'Port Forwards' :
            tab === 'settings-reservations' ? 'DHCP Reservations' :
            'Diagnostics'
          }</h1>
          {networkDetail && (
            <div className="header-stats">
              <span className={`header-pill status-${networkDetail.status}`}>
                {networkDetail.status === 'connected' || networkDetail.status === 'green' ? '● Online' : '● ' + (networkDetail.status || 'Unknown')}
              </span>
              {networkDetail.speed?.down && (
                <span className="header-pill">
                  ↓{networkDetail.speed.down.value} ↑{networkDetail.speed.up?.value} {networkDetail.speed.down.units}
                </span>
              )}
            </div>
          )}
        </header>

        {selectedNetwork && (
          <div className="tab-content">
            {tab === 'devices' && <DeviceList networkId={selectedNetwork} />}
            {tab === 'activity' && <ActivityView networkId={selectedNetwork} />}
            {tab === 'profiles' && <ProfileManager networkId={selectedNetwork} />}
            {tab === 'settings-security' && <SecuritySettings networkId={selectedNetwork} />}
            {tab === 'settings-dns' && <DnsSettings networkId={selectedNetwork} />}
            {tab === 'settings-forwards' && <PortForwardsSettings networkId={selectedNetwork} />}
            {tab === 'settings-reservations' && <DhcpReservationsSettings networkId={selectedNetwork} />}
            {tab === 'settings-diagnostics' && <DiagnosticsSettings networkId={selectedNetwork} />}
          </div>
        )}
      </main>
    </div>
  );
}
