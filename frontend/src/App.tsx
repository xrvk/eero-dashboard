import { Suspense, lazy, useCallback, useEffect, useState } from 'react';

import * as api from './api';
import LoginForm from './components/LoginForm';
import { useFetch } from './hooks/useFetch';
import AppContent from './features/app/AppContent';
import AppSidebar from './features/app/AppSidebar';
import type { AppTab } from './features/app/types';

const SpeedHistory = lazy(() => import('./components/SpeedHistory'));

function getNetworkId(n: api.Network): string {
  if (n.id != null) return String(n.id);
  if (n.url) return n.url.replace(/\/$/, '').split('/').pop() || '';
  return '';
}

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'speed') {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center' }}>
        <main className="app-main" style={{ maxWidth: 900, width: '100%' }}>
          <header className="app-header"><h1>Speed History Preview</h1></header>
          <div className="tab-content">
            <div className="activity-panel full-width">
              <Suspense fallback={<div className="card loading-card"><div className="spinner" /> Loading…</div>}>
                <SpeedHistory networkId="preview" />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <AppMain />;
}

function AppMain() {
  const [auth, setAuth] = useState<api.AuthStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [networks, setNetworks] = useState<api.Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [tab, setTab] = useState<AppTab>('devices');
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>(() => (localStorage.getItem('theme') as 'dark' | 'light' | 'auto') || 'dark');

  const { data: networkDetail } = useFetch(
    () => selectedNetwork ? api.getNetwork(selectedNetwork) : Promise.resolve(null),
    [selectedNetwork]
  );
  const { data: eeroData } = useFetch(
    () => selectedNetwork ? api.getEeros(selectedNetwork) : Promise.resolve({ eeros: [] }),
    [selectedNetwork]
  );

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!selectedNetwork) return;
    void api.prefetch(selectedNetwork);
  }, [selectedNetwork]);

  const handleLogout = async () => {
    await api.logout();
    setAuth({ authenticated: false });
    setNetworks([]);
    setSelectedNetwork(null);
  };

  if (checking) return <div className="app-loading"><div className="spinner" /></div>;
  if (!auth?.authenticated) return <LoginForm onAuthenticated={checkAuth} />;

  return (
    <div className="app">
      <AppSidebar
        tab={tab}
        setTab={setTab}
        eeros={eeroData?.eeros ?? []}
        networks={networks}
        selectedNetwork={selectedNetwork}
        setSelectedNetwork={setSelectedNetwork}
        networkDetail={networkDetail}
        auth={auth}
      />

      <main className="app-main">
        <header className="app-header">
          <h1>{
            tab === 'devices' ? 'Devices' :
            tab === 'activity' ? 'Network Health' :
            tab === 'profiles' ? 'Profiles' :
            tab === 'settings-general' ? 'General' :
            tab === 'settings-forwards' ? 'Port Forwards' :
            tab === 'settings-reservations' ? 'DHCP Reservations' :
            tab === 'settings-guest' ? 'Guest Network' :
            'Blacklist'
          }</h1>
          <div className="header-actions">
            <div className="theme-dropdown">
              <button className="btn-header-icon" onClick={() => setThemeMenuOpen(!themeMenuOpen)} title="Theme">
                {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌗'}
              </button>
              {themeMenuOpen && (
                <div className="theme-menu" onClick={() => setThemeMenuOpen(false)}>
                  <button className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                    ☀️ Light
                  </button>
                  <button className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                    🌙 Dark
                  </button>
                  <button className={`theme-option ${theme === 'auto' ? 'active' : ''}`} onClick={() => setTheme('auto')}>
                    🌗 Auto
                  </button>
                </div>
              )}
            </div>
            <button className="btn-logout" onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        <AppContent selectedNetwork={selectedNetwork} tab={tab} setTab={setTab} />
      </main>
    </div>
  );
}
