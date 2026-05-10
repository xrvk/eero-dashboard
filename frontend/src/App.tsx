import { useState, useEffect, useCallback } from 'react';
import * as api from './api';
import LoginForm from './components/LoginForm';
import DeviceList from './components/DeviceList';
import EeroNodes from './components/EeroNodes';
import ActivityView from './components/ActivityView';
import ProfileManager from './components/ProfileManager';
import SettingsView from './components/SettingsView';

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
  const [tab, setTab] = useState<'devices' | 'nodes' | 'activity' | 'profiles' | 'settings'>('devices');

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
      <header className="app-header">
        <div className="header-left">
          <svg className="header-logo" width="28" height="28" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" />
            <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
            <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.8" />
          </svg>
          <h1>eero Dashboard</h1>
        </div>
        <div className="header-right">
          {auth.name && <span className="user-name">{auth.name}</span>}
          <button className="btn-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="app-main">
        {networks.length > 1 && (
          <div className="network-selector">
            {networks.map((n) => {
              const id = getNetworkId(n);
              return (
                <button
                  key={id}
                  className={`net-tab ${selectedNetwork === id ? 'active' : ''}`}
                  onClick={() => setSelectedNetwork(id)}
                >
                  {n.name}
                </button>
              );
            })}
          </div>
        )}

        {networkDetail && (
          <div className="overview-row">
            <div className="overview-card">
              <span className="overview-label">Network</span>
              <span className="overview-value">{networkDetail.name}</span>
            </div>
            <div className="overview-card">
              <span className="overview-label">Status</span>
              <span className={`overview-value status-${networkDetail.status}`}>
                {networkDetail.status === 'connected' || networkDetail.status === 'green' ? '● Online' : networkDetail.status || '—'}
              </span>
            </div>
            {networkDetail.speed?.down && (
              <div className="overview-card">
                <span className="overview-label">Speed</span>
                <span className="overview-value">
                  ↓ {networkDetail.speed.down.value} {networkDetail.speed.down.units}
                  {networkDetail.speed.up && (
                    <> &nbsp;↑ {networkDetail.speed.up.value} {networkDetail.speed.up.units}</>
                  )}
                </span>
              </div>
            )}
            {networkDetail.clients && (
              <div className="overview-card">
                <span className="overview-label">Clients</span>
                <span className="overview-value">{networkDetail.clients.count}</span>
              </div>
            )}
            {networkDetail.eeros && (
              <div className="overview-card">
                <span className="overview-label">Nodes</span>
                <span className="overview-value">{networkDetail.eeros.count}</span>
              </div>
            )}
          </div>
        )}

        <div className="tab-bar">
          <button className={`tab ${tab === 'devices' ? 'active' : ''}`} onClick={() => setTab('devices')}>
            Devices
          </button>
          <button className={`tab ${tab === 'nodes' ? 'active' : ''}`} onClick={() => setTab('nodes')}>
            Nodes
          </button>
          <button className={`tab ${tab === 'activity' ? 'active' : ''}`} onClick={() => setTab('activity')}>
            Health
          </button>
          <button className={`tab ${tab === 'profiles' ? 'active' : ''}`} onClick={() => setTab('profiles')}>
            Profiles
          </button>
          <button className={`tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            Settings
          </button>
        </div>

        {selectedNetwork && (
          <div className="tab-content">
            {tab === 'devices' && <DeviceList networkId={selectedNetwork} />}
            {tab === 'nodes' && <EeroNodes networkId={selectedNetwork} />}
            {tab === 'activity' && <ActivityView networkId={selectedNetwork} />}
            {tab === 'profiles' && <ProfileManager networkId={selectedNetwork} />}
            {tab === 'settings' && <SettingsView networkId={selectedNetwork} />}
          </div>
        )}
      </main>
    </div>
  );
}
