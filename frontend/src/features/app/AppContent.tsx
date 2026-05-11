import { Suspense, lazy, useEffect } from 'react';

import type { AppTab } from './types';

const chunks = {
  DeviceList: () => import('../../components/DeviceList'),
  ActivityView: () => import('../../components/ActivityView'),
  ProfileManager: () => import('../../components/ProfileManager'),
  GuestNetwork: () => import('../../components/GuestNetwork'),
  SettingsView: () => import('../../components/SettingsView'),
};

const DeviceList = lazy(chunks.DeviceList);
const ActivityView = lazy(chunks.ActivityView);
const ProfileManager = lazy(chunks.ProfileManager);
const GuestNetwork = lazy(chunks.GuestNetwork);
const GeneralSettings = lazy(() => chunks.SettingsView().then((m) => ({ default: m.GeneralSettings })));
const PortForwardsSettings = lazy(() => chunks.SettingsView().then((m) => ({ default: m.PortForwardsSettings })));
const DhcpReservationsSettings = lazy(() => chunks.SettingsView().then((m) => ({ default: m.DhcpReservationsSettings })));
const BlacklistSettings = lazy(() => chunks.SettingsView().then((m) => ({ default: m.BlacklistSettings })));

/** Eagerly load all chunks once a network is selected. */
function usePreloadChunks(selectedNetwork: string | null) {
  useEffect(() => {
    if (!selectedNetwork) return;
    Object.values(chunks).forEach((load) => load());
  }, [selectedNetwork]);
}

interface AppContentProps {
  selectedNetwork: string | null;
  tab: AppTab;
  setTab: (tab: AppTab) => void;
}

export default function AppContent({ selectedNetwork, tab, setTab }: AppContentProps) {
  usePreloadChunks(selectedNetwork);

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
