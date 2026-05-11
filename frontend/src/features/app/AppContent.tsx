import type { AppTab, SignalFilter } from './types';
import type { EeroNode } from '../../api';
import DeviceList from '../../components/DeviceList';
import ActivityView from '../../components/ActivityView';
import ProfileManager from '../../components/ProfileManager';
import GuestNetwork from '../../components/GuestNetwork';
import { GeneralSettings, PortForwardsSettings, DhcpReservationsSettings, BlacklistSettings } from '../../components/SettingsView';

interface AppContentProps {
  selectedNetwork: string | null;
  tab: AppTab;
  setTab: (tab: AppTab) => void;
  signalFilter?: SignalFilter;
  onClearSignalFilter?: () => void;
  onSignalClick?: (tier: SignalFilter) => void;
  onNodeClick?: (eeroId: string, node: EeroNode) => void;
}

export default function AppContent({ selectedNetwork, tab, setTab, signalFilter, onClearSignalFilter, onSignalClick, onNodeClick: _onNodeClick }: AppContentProps) {
  if (!selectedNetwork) return null;

  return (
    <div className="tab-content">
      {tab === 'devices' && (
        <DeviceList
          networkId={selectedNetwork}
          onNavigate={(t) => setTab(t as AppTab)}
          signalFilter={signalFilter}
          onClearSignalFilter={onClearSignalFilter}
        />
      )}
      {tab === 'activity' && <ActivityView networkId={selectedNetwork} onSignalClick={onSignalClick} />}
      {tab === 'profiles' && <ProfileManager networkId={selectedNetwork} />}
      {tab === 'settings-general' && <GeneralSettings networkId={selectedNetwork} />}
      {tab === 'settings-forwards' && <PortForwardsSettings networkId={selectedNetwork} />}
      {tab === 'settings-reservations' && <DhcpReservationsSettings networkId={selectedNetwork} />}
      {tab === 'settings-guest' && <GuestNetwork networkId={selectedNetwork} />}
      {tab === 'settings-blacklist' && <BlacklistSettings networkId={selectedNetwork} />}
    </div>
  );
}
