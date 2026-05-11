import { request } from './client';
import type { SqmSettings, GuestNetworkSettings, DnsSettingsData, FirmwareUpdate } from './types';

export interface Network {
  id?: number;
  url?: string;
  name: string;
  status?: string;
  speed?: { down?: { value: number; units: string }; up?: { value: number; units: string }; date?: string };
  eeros?: { count: number };
  clients?: { count: number };
  gateway_eero?: string;
  password?: string;
  timezone?: { value?: string } | string;
  sqm?: SqmSettings;
  upnp?: boolean;
  ipv6_upstream?: boolean;
  band_steering?: boolean;
  wpa3?: boolean;
  thread?: boolean;
  guest_network?: GuestNetworkSettings;
  dns?: DnsSettingsData;
  premium_status?: string;
  updates?: FirmwareUpdate[] | Record<string, unknown>;
  wan_ip?: string;
  gateway_ip?: string;
  [key: string]: unknown;
}

export const getNetworks = () =>
  request<{ networks: Network[] }>('/networks');

export const getNetwork = (id: string) =>
  request<Network>(`/networks/${id}`);

// Speed Test
export interface SpeedHistoryEntry {
  date: string;
  up: number | null;
  down: number | null;
}

export const runSpeedTest = (networkId: string) =>
  request<Network['speed']>(`/networks/${networkId}/speed-test`, { method: 'POST' });

export const getSpeedHistory = (networkId: string) =>
  request<{ history: SpeedHistoryEntry[]; retention_days: number }>(`/networks/${networkId}/speed-history`);
