import { Suspense, lazy, useCallback, useEffect, useState, useRef } from 'react';
import { Moon, Sun, SunMoon } from 'lucide-react';

import * as api from './api';
import LoginForm from './components/LoginForm';
import NodeDrawer from './components/NodeDrawer';
import { useFetch } from './hooks/useFetch';
import { useHashRoute } from './hooks/useHashRoute';
import AppContent from './features/app/AppContent';
import AppSidebar from './features/app/AppSidebar';
import type { AppTab } from './features/app/types';
import type { SignalFilter } from './features/app/types';

const MOBILE_BREAKPOINT = 768;

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
  const { tab, params, setRoute } = useHashRoute();
  const setTab = useCallback((t: AppTab) => setRoute(t), [setRoute]);
  const signalFilter = (params.get('signal') as SignalFilter) || 'all';
  const handleSignalClick = useCallback((tier: SignalFilter) => {
    setRoute('devices', { signal: tier });
  }, [setRoute]);
  const handleClearSignalFilter = useCallback(() => {
    setRoute('devices');
  }, [setRoute]);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>(() => (localStorage.getItem('theme') as 'dark' | 'light' | 'auto') || 'dark');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [nodeDrawer, setNodeDrawer] = useState<{ node: api.EeroNode } | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT + 1}px)`);
    const handler = () => { if (mq.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const { data: networkDetail } = useFetch(
    () => selectedNetwork ? api.getNetwork(selectedNetwork) : Promise.resolve(null),
    [selectedNetwork],
    {},
    selectedNetwork ? `/networks/${selectedNetwork}` : undefined,
  );
  const { data: eeroData } = useFetch(
    () => selectedNetwork ? api.getEeros(selectedNetwork) : Promise.resolve({ eeros: [] }),
    [selectedNetwork],
    {},
    selectedNetwork ? `/networks/${selectedNetwork}/eeros` : undefined,
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

  const handleNodeClick = useCallback((_eeroId: string, node: api.EeroNode) => {
    setNodeDrawer({ node });
  }, []);

  if (checking) return <div className="app-loading"><div className="spinner" /></div>;
  if (!auth?.authenticated) return <LoginForm onAuthenticated={checkAuth} />;

  return (
    <div className="app">
      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
      <div ref={sidebarRef} className={`sidebar-drawer ${sidebarOpen ? 'open' : ''}`}>
        <AppSidebar
          tab={tab}
          setTab={setTab}
          eeros={eeroData?.eeros ?? []}
          networks={networks}
          selectedNetwork={selectedNetwork}
          setSelectedNetwork={setSelectedNetwork}
          networkDetail={networkDetail}
          auth={auth}
          onNavClick={closeSidebar}
          onNodeClick={handleNodeClick}
        />
      </div>

      <main className="app-main">
        <header className="app-header">
          <div className="header-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={sidebarOpen}
            >
              <span className={`hamburger-icon ${sidebarOpen ? 'open' : ''}`}>
                <span /><span /><span />
              </span>
            </button>
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
          </div>
          <div className="header-actions">
            <div className="theme-dropdown">
              <button className="btn-header-icon" onClick={() => setThemeMenuOpen(!themeMenuOpen)} title="Theme">
                {theme === 'dark' ? <Moon size={18} /> : theme === 'light' ? <Sun size={18} /> : <SunMoon size={18} />}
              </button>
              {themeMenuOpen && (
                <div className="theme-menu" onClick={() => setThemeMenuOpen(false)}>
                  <button className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
                    <Sun size={14} /> Light
                  </button>
                  <button className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
                    <Moon size={14} /> Dark
                  </button>
                  <button className={`theme-option ${theme === 'auto' ? 'active' : ''}`} onClick={() => setTheme('auto')}>
                    <SunMoon size={14} /> Auto
                  </button>
                </div>
              )}
            </div>
            <button className="btn-logout" onClick={handleLogout}>Sign out</button>
          </div>
        </header>

        <AppContent
          selectedNetwork={selectedNetwork}
          tab={tab}
          setTab={setTab}
          signalFilter={signalFilter}
          onClearSignalFilter={handleClearSignalFilter}
          onSignalClick={handleSignalClick}
          onNodeClick={handleNodeClick}
        />
      </main>

      {nodeDrawer && selectedNetwork && (
        <NodeDrawer
          networkId={selectedNetwork}
          node={nodeDrawer.node}
          onClose={() => setNodeDrawer(null)}
        />
      )}
    </div>
  );
}
