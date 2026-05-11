import { Suspense, lazy, useCallback, useEffect, useState, useRef } from 'react';
import { Moon, Sun, SunMoon } from 'lucide-react';

import LoginForm from './components/LoginForm';
import NodeDrawer from './components/NodeDrawer';
import { useHashRoute } from './hooks/useHashRoute';
import AppContent from './features/app/AppContent';
import AppSidebar from './features/app/AppSidebar';
import type { AppTab } from './features/app/types';
import type { SignalFilter, BandClickFilter } from './features/app/types';
import { ThemeProvider, useTheme } from './features/app/ThemeContext';
import { AuthProvider, useAuth } from './features/app/AuthContext';
import { NetworkProvider, useNetwork } from './features/app/NetworkContext';
import type { EeroNode } from './api';

const MOBILE_BREAKPOINT = 768;

const SpeedHistory = lazy(() => import('./components/SpeedHistory'));

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

  return (
    <ThemeProvider>
      <NetworkProvider>
        <AppShell />
      </NetworkProvider>
    </ThemeProvider>
  );
}

function AppShell() {
  const { setNetworks } = useNetwork();

  const handleNetworksLoaded = useCallback((nets: import('./api').Network[]) => {
    setNetworks(nets);
  }, [setNetworks]);

  return (
    <AuthProvider onNetworksLoaded={handleNetworksLoaded}>
      <AppMain />
    </AuthProvider>
  );
}

function AppMain() {
  const { auth, checking, checkAuth, logout } = useAuth();
  const { networks, selectedNetwork, setSelectedNetwork, networkDetail, eeros, setNetworks } = useNetwork();
  const { theme, setTheme } = useTheme();
  const { tab, params, setRoute } = useHashRoute();
  const setTab = useCallback((t: AppTab) => setRoute(t), [setRoute]);
  const signalFilter = (params.get('signal') as SignalFilter) || 'all';
  const handleSignalClick = useCallback((tier: SignalFilter) => {
    setRoute('devices', { signal: tier });
  }, [setRoute]);
  const handleClearSignalFilter = useCallback(() => {
    setRoute('devices');
  }, [setRoute]);
  const bandClickFilter = (params.get('band') as BandClickFilter) || 'all';
  const handleBandClick = useCallback((band: BandClickFilter) => {
    setRoute('devices', { band });
  }, [setRoute]);
  const handleClearBandClickFilter = useCallback(() => {
    setRoute('devices');
  }, [setRoute]);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [nodeDrawer, setNodeDrawer] = useState<{ node: EeroNode } | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT + 1}px)`);
    const handler = () => { if (mq.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleLogout = async () => {
    await logout();
    setNetworks([]);
  };

  const handleNodeClick = useCallback((_eeroId: string, node: EeroNode) => {
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
          eeros={eeros}
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
          bandClickFilter={bandClickFilter}
          onClearBandClickFilter={handleClearBandClickFilter}
          onBandClick={handleBandClick}
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
