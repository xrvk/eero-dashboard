/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as api from '../../api';
import { useFetch } from '../../hooks/useFetch';

function getNetworkId(n: api.Network): string {
  if (n.id != null) return String(n.id);
  if (n.url) return n.url.replace(/\/$/, '').split('/').pop() || '';
  return '';
}

interface NetworkContextValue {
  networks: api.Network[];
  selectedNetwork: string | null;
  setSelectedNetwork: (id: string) => void;
  networkDetail: api.Network | null;
  eeros: api.EeroNode[];
  setNetworks: (networks: api.Network[]) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [networks, setNetworks] = useState<api.Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);

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
    if (!selectedNetwork) return;
    void api.prefetch(selectedNetwork);
  }, [selectedNetwork]);

  const handleSetNetworks = useCallback((nets: api.Network[]) => {
    setNetworks(nets);
    if (nets.length > 0) {
      setSelectedNetwork((prev) => prev ?? getNetworkId(nets[0]));
    }
  }, []);

  return (
    <NetworkContext.Provider value={{
      networks,
      selectedNetwork,
      setSelectedNetwork,
      networkDetail: networkDetail ?? null,
      eeros: eeroData?.eeros ?? [],
      setNetworks: handleSetNetworks,
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within NetworkProvider');
  return ctx;
}
