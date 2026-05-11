import { Suspense, lazy } from 'react';

import type { AppTab } from './types';

const DeviceList = lazy(() => import('../../components/DeviceList'));
const ActivityView = lazy(() => import('../../components/ActivityView'));
const ProfileManager = lazy(() => import('../../components/ProfileManager'));
const GuestNetwork = lazy(() => import('../../components/GuestNetwork'));
const GeneralSettings = lazy(() => import('../../components/SettingsView').then((m) => ({ default: m.GeneralSettings })));
const PortForwardsSettings = lazy(() => import('../../components/SettingsView').then((m) => ({ default: m.PortForwardsSettings })));
const DhcpReservationsSettings = lazy(() => import('../../components/SettingsView').then((m) => ({ default: m.DhcpReservationsSettings })));
const BlacklistSettings = lazy(() => import('../../components/SettingsView').then((m) => ({ default: m.BlacklistSettings })));

interface AppContentProps {
  selectedNetwork: string | null;
  tab: AppTab;
  setTab: (tab: AppTab) => void;
}

export default function AppContent({ selectedNetwork, tab, setTab }: AppContentProps) {
  if (!selectedNetwork) return null;

  return (
    <div className="tab-content">
      <Suspense fallback={<div className="card loading-card"><div className="spinner" /> Loading…</div>}>
        {tab === 'devices' && <DeviceList networkId={selectedNetwork} onNavigate={(t) => setTab(t as AppTab)} />}
        {tab === 'activity' && <ActivityView networkId={selectedNetwork} />}
        {tab === 'profiles' && <ProfileManager networkId={selectedNetwork} />}
        {tab === 'settings-general' && <GeneralSettings networkId={selectedNetwork} />}
        {tab === 'settings-forwards' && <PortForwardsSettings networkId={selectedNetwork} />}
        {tab === 'settings-reservations' && <DhcpReservationsSettings networkId={selectedNetwork} />}
        {tab === 'settings-guest' && <GuestNetwork networkId={selectedNetwork} />}
        {tab === 'settings-blacklist' && <BlacklistSettings networkId={selectedNetwork} />}
      </Suspense>
    </div>
  );
}
