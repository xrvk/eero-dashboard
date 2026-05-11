import type { AppTab, SignalFilter, BandClickFilter } from './types';
import DeviceList from '../../components/DeviceList';
import ActivityView from '../../components/ActivityView';
import ProfileManager from '../../components/ProfileManager';
import GuestNetwork from '../../components/GuestNetwork';
import { GeneralSettings, PortForwardsSettings, DhcpReservationsSettings, BlacklistSettings } from '../../components/SettingsView';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

interface AppContentProps {
  selectedNetwork: string | null;
  tab: AppTab;
  setTab: (tab: AppTab) => void;
  signalFilter?: SignalFilter;
  onClearSignalFilter?: () => void;
  onSignalClick?: (tier: SignalFilter) => void;
  bandClickFilter?: BandClickFilter;
  onClearBandClickFilter?: () => void;
  onBandClick?: (band: BandClickFilter) => void;
}

export default function AppContent({ selectedNetwork, tab, setTab, signalFilter, onClearSignalFilter, onSignalClick, bandClickFilter, onClearBandClickFilter, onBandClick }: AppContentProps) {
  if (!selectedNetwork) return null;

  return (
    <div className="tab-content">
      {tab === 'devices' && (
        <ErrorBoundary name="Devices">
          <DeviceList
            networkId={selectedNetwork}
            onNavigate={(t) => setTab(t as AppTab)}
            signalFilter={signalFilter}
            onClearSignalFilter={onClearSignalFilter}
            bandClickFilter={bandClickFilter}
            onClearBandClickFilter={onClearBandClickFilter}
          />
        </ErrorBoundary>
      )}
      {tab === 'activity' && <ErrorBoundary name="Health"><ActivityView networkId={selectedNetwork} onSignalClick={onSignalClick} onBandClick={onBandClick} /></ErrorBoundary>}
      {tab === 'profiles' && <ErrorBoundary name="Profiles"><ProfileManager networkId={selectedNetwork} /></ErrorBoundary>}
      {tab === 'settings-general' && <ErrorBoundary name="General Settings"><GeneralSettings networkId={selectedNetwork} /></ErrorBoundary>}
      {tab === 'settings-forwards' && <ErrorBoundary name="Port Forwards"><PortForwardsSettings networkId={selectedNetwork} /></ErrorBoundary>}
      {tab === 'settings-reservations' && <ErrorBoundary name="DHCP Reservations"><DhcpReservationsSettings networkId={selectedNetwork} /></ErrorBoundary>}
      {tab === 'settings-guest' && <ErrorBoundary name="Guest Network"><GuestNetwork networkId={selectedNetwork} /></ErrorBoundary>}
      {tab === 'settings-blacklist' && <ErrorBoundary name="Blacklist"><BlacklistSettings networkId={selectedNetwork} /></ErrorBoundary>}
    </div>
  );
}
