import { request } from './client';
import type { SqmSettings, GuestNetworkSettings, DnsSettingsData, FirmwareUpdate } from './types';
import type { Network } from './networks';

export interface SecuritySettings {
  wpa3?: boolean;
  band_steering?: boolean;
  upnp?: boolean;
  ipv6_upstream?: boolean;
  thread?: boolean;
  [key: string]: unknown;
}

export interface ForwardEntry {
  url?: string;
  ip?: string;
  gateway_port?: number;
  client_port?: number;
  protocol?: string;
  description?: string;
  enabled?: boolean;
}

export interface ReservationEntry {
  url?: string;
  ip?: string;
  mac?: string;
  description?: string;
  hostname?: string;
  nickname?: string;
}

export interface BlacklistEntry {
  url?: string;
  mac?: string;
  display_name?: string;
  hostname?: string;
  nickname?: string;
}

export interface DiagnosticsResult {
  [key: string]: unknown;
}

export interface NetworkSettingsSummary {
  name: string;
  password: string;
  timezone: { value?: string } | string;
  sqm: SqmSettings;
  upnp?: boolean;
  ipv6_upstream?: boolean;
  band_steering?: boolean;
  wpa3?: boolean;
  thread?: boolean;
  guest_network: GuestNetworkSettings;
  dns: DnsSettingsData;
  premium_status: string;
  updates: FirmwareUpdate[] | Record<string, unknown>;
  speed: Network['speed'];
  wan_ip: string;
  gateway_ip: string;
  status: string;
}

// General Settings
export const getSettings = (networkId: string) =>
  request<NetworkSettingsSummary>(`/networks/${networkId}/settings`);

// Security
export const getSecurity = (networkId: string) =>
  request<SecuritySettings>(`/networks/${networkId}/security`);

export const updateSecurity = (networkId: string, settings: {
  wpa3?: boolean; band_steering?: boolean; upnp?: boolean; ipv6?: boolean; thread?: boolean;
}) =>
  request(`/networks/${networkId}/security`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });

// DNS
export const getDns = (networkId: string) =>
  request<{ dns?: DnsSettingsData } & DnsSettingsData>(`/networks/${networkId}/dns`);

export const setDnsMode = (networkId: string, mode: string, customServers?: string[]) =>
  request(`/networks/${networkId}/dns/mode`, {
    method: 'POST',
    body: JSON.stringify({ mode, custom_servers: customServers }),
  });

export const setDnsCaching = (networkId: string, enabled: boolean) =>
  request(`/networks/${networkId}/dns/caching`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });

// Port Forwarding & Reservations
export const getForwards = (networkId: string) =>
  request<{ forwards?: ForwardEntry[] } | ForwardEntry[]>(`/networks/${networkId}/forwards`);

export const createForward = (networkId: string, data: {
  ip: string; gateway_port: number; client_port: number; protocol?: string; description?: string; enabled?: boolean;
}) =>
  request(`/networks/${networkId}/forwards`, { method: 'POST', body: JSON.stringify(data) });

export const deleteForward = (networkId: string, forwardId: string) =>
  request(`/networks/${networkId}/forwards/${forwardId}`, { method: 'DELETE' });

export const getReservations = (networkId: string) =>
  request<{ reservations?: ReservationEntry[] } | ReservationEntry[]>(`/networks/${networkId}/reservations`);

export const createReservation = (networkId: string, data: { ip: string; mac: string; description?: string }) =>
  request(`/networks/${networkId}/reservations`, { method: 'POST', body: JSON.stringify(data) });

export const deleteReservation = (networkId: string, reservationId: string) =>
  request(`/networks/${networkId}/reservations/${reservationId}`, { method: 'DELETE' });

// Wi-Fi Password
export const getPassword = (networkId: string) =>
  request<{ password?: string; key?: string }>(`/networks/${networkId}/password`);

// Network Name
export const setNetworkName = (networkId: string, name: string) =>
  request(`/networks/${networkId}/name`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

// Guest Network
export const setGuestNetwork = (networkId: string, enabled: boolean, name?: string, password?: string) =>
  request(`/networks/${networkId}/guest`, {
    method: 'POST',
    body: JSON.stringify({ enabled, name, password }),
  });

// SQM / QoS
export const getSqm = (networkId: string) =>
  request<SqmSettings>(`/networks/${networkId}/sqm`);

export const setSqmEnabled = (networkId: string, enabled: boolean) =>
  request(`/networks/${networkId}/sqm`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });

export const configureSqm = (networkId: string, enabled: boolean, uploadMbps?: number, downloadMbps?: number) =>
  request(`/networks/${networkId}/sqm/configure`, {
    method: 'POST',
    body: JSON.stringify({ enabled, upload_mbps: uploadMbps, download_mbps: downloadMbps }),
  });

export const setSqmAuto = (networkId: string) =>
  request(`/networks/${networkId}/sqm/auto`, { method: 'POST' });

// Firmware Updates
export const getUpdates = (networkId: string) =>
  request<FirmwareUpdate[] | Record<string, unknown>>(`/networks/${networkId}/updates`);

// Network Reboot
export const rebootNetwork = (networkId: string) =>
  request(`/networks/${networkId}/reboot`, { method: 'POST' });

// Thread / Smart Home
export const getThread = (networkId: string) =>
  request<{ enabled?: boolean; status?: string; [key: string]: unknown }>(`/networks/${networkId}/thread`);

export const getRouting = (networkId: string) =>
  request<{ mode?: string; [key: string]: unknown }>(`/networks/${networkId}/routing`);

// Blacklist
export const getBlacklist = (networkId: string) =>
  request<{ blacklist?: BlacklistEntry[] } | BlacklistEntry[]>(`/networks/${networkId}/blacklist`);

export const addToBlacklist = (networkId: string, deviceId: string) =>
  request(`/networks/${networkId}/blacklist/${deviceId}`, { method: 'POST' });

export const removeFromBlacklist = (networkId: string, deviceId: string) =>
  request(`/networks/${networkId}/blacklist/${deviceId}`, { method: 'DELETE' });

// Diagnostics
export const getDiagnostics = (networkId: string) =>
  request<DiagnosticsResult>(`/networks/${networkId}/diagnostics`);

export const runDiagnostics = (networkId: string) =>
  request<DiagnosticsResult>(`/networks/${networkId}/diagnostics`, { method: 'POST' });
