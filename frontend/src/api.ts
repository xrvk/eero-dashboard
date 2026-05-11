import { request } from './api/client';

// Compatibility exports:
// prefer importing from feature API modules (e.g. ./api/devices) for new work.
export {
  blockDevice,
  getDevice,
  getDevicePriority,
  getDevices,
  pauseDevice,
  renameDevice,
  setDeviceNickname,
  setDevicePriority,
} from './api/devices';
export type { Device } from './api/devices';

// Auth
export interface AuthStatus {
  authenticated: boolean;
  name?: string;
  email?: string;
}

export const getAuthStatus = () => request<AuthStatus>('/auth/status');

export const login = (identifier: string) =>
  request<{ status: string; message: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  });

export const verify = (code: string) =>
  request<{ status: string }>('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });

export const logout = () =>
  request<{ status: string }>('/auth/logout', { method: 'POST' });

// Networks
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

export const prefetch = (networkId: string) =>
  request<{ status: string; cached: number }>(`/prefetch/${networkId}`, { method: 'POST' }).catch(() => {});

// Eeros (nodes)
export interface EeroNode {
  url?: string;
  serial?: string;
  model?: string;
  location?: string;
  status?: string;
  connected_clients_count?: number;
  mesh_quality_bars?: number;
  gateway?: boolean;
  ip_address?: string;
  [key: string]: unknown;
}

export const getEeros = (networkId: string) =>
  request<{ eeros: EeroNode[] }>(`/networks/${networkId}/eeros`);

// Profiles
export interface Profile {
  url?: string;
  name?: string;
  paused?: boolean;
  devices?: { url: string }[];
  [key: string]: unknown;
}

export interface DnsCustomConfig {
  ips?: string[];
}

export interface DnsSettingsData {
  mode?: string;
  caching?: boolean;
  custom?: DnsCustomConfig;
  [key: string]: unknown;
}

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

export interface SqmSettings {
  enabled?: boolean;
  mode?: string;
  upload_bandwidth_mbps?: number;
  download_bandwidth_mbps?: number;
  [key: string]: unknown;
}

export interface FirmwareUpdate {
  title?: string;
  status?: string;
  [key: string]: unknown;
}

export interface DiagnosticsResult {
  [key: string]: unknown;
}

export interface GuestNetworkSettings {
  enabled?: boolean;
  name?: string;
  password?: string;
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

export const getProfiles = (networkId: string) =>
  request<{ profiles: Profile[] }>(`/networks/${networkId}/profiles`);

// Activity
export const getActivity = (networkId: string) =>
  request<{ summary?: Record<string, unknown>; [key: string]: unknown }>(`/networks/${networkId}/activity`);

export const getActivityHistory = (networkId: string, period = 'day') =>
  request<{ history?: Array<Record<string, unknown>>; [key: string]: unknown }>(`/networks/${networkId}/activity/history?period=${period}`);

export const getActivityClients = (networkId: string) =>
  request<{ clients?: Array<Record<string, unknown>>; [key: string]: unknown }>(`/networks/${networkId}/activity/clients`);

export const getActivityCategories = (networkId: string) =>
  request<{ categories?: Array<Record<string, unknown>>; [key: string]: unknown }>(`/networks/${networkId}/activity/categories`);

// Speed Test
export const runSpeedTest = (networkId: string) =>
  request<Network['speed']>(`/networks/${networkId}/speed-test`, { method: 'POST' });

export interface SpeedHistoryEntry {
  date: string;
  up: number | null;
  down: number | null;
}

export const getSpeedHistory = (networkId: string) =>
  request<{ history: SpeedHistoryEntry[]; retention_days: number }>(`/networks/${networkId}/speed-history`);

// Diagnostics
export const getDiagnostics = (networkId: string) =>
  request<DiagnosticsResult>(`/networks/${networkId}/diagnostics`);

export const runDiagnostics = (networkId: string) =>
  request<DiagnosticsResult>(`/networks/${networkId}/diagnostics`, { method: 'POST' });

// Profile Actions
export const pauseProfile = (networkId: string, profileId: string, paused: boolean) =>
  request(`/networks/${networkId}/profiles/${profileId}/pause`, {
    method: 'POST',
    body: JSON.stringify({ paused }),
  });

export const setBedtime = (networkId: string, profileId: string, startTime: string, endTime: string, days?: string[]) =>
  request(`/networks/${networkId}/profiles/${profileId}/bedtime`, {
    method: 'POST',
    body: JSON.stringify({ start_time: startTime, end_time: endTime, days }),
  });

export const getBlockedApps = (networkId: string, profileId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/profiles/${profileId}/blocked-apps`);

export const setBlockedApps = (networkId: string, profileId: string, applications: string[]) =>
  request(`/networks/${networkId}/profiles/${profileId}/blocked-apps`, {
    method: 'POST',
    body: JSON.stringify({ applications }),
  });

export const setProfileDevices = (networkId: string, profileId: string, deviceUrls: string[]) =>
  request(`/networks/${networkId}/profiles/${profileId}/devices`, {
    method: 'PUT',
    body: JSON.stringify({ device_urls: deviceUrls }),
  });

export const getProfileSchedule = (networkId: string, profileId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/profiles/${profileId}/schedule`);

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

// Reboot
export const rebootEero = (networkId: string, eeroId: string) =>
  request(`/networks/${networkId}/eeros/${eeroId}/reboot`, { method: 'POST' });

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

// Node LED
export const getLedStatus = (networkId: string, eeroId: string) =>
  request<{ led_on?: boolean; brightness?: number }>(`/networks/${networkId}/eeros/${eeroId}/led`);

export const setLed = (networkId: string, eeroId: string, enabled: boolean) =>
  request(`/networks/${networkId}/eeros/${eeroId}/led`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });

export const setLedBrightness = (networkId: string, eeroId: string, brightness: number) =>
  request(`/networks/${networkId}/eeros/${eeroId}/led/brightness`, {
    method: 'POST',
    body: JSON.stringify({ brightness }),
  });

// Nightlight
export const getNightlight = (networkId: string, eeroId: string) =>
  request<{ enabled?: boolean; brightness?: number; [key: string]: unknown }>(`/networks/${networkId}/eeros/${eeroId}/nightlight`);

export const setNightlight = (networkId: string, eeroId: string, settings: {
  enabled?: boolean; brightness?: number; schedule_enabled?: boolean;
  schedule_on?: string; schedule_off?: string; ambient_light_enabled?: boolean;
}) =>
  request(`/networks/${networkId}/eeros/${eeroId}/nightlight`, {
    method: 'POST',
    body: JSON.stringify(settings),
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

// Content Filtering
export const updateContentFilter = (networkId: string, profileId: string, filters: Record<string, boolean>) =>
  request(`/networks/${networkId}/profiles/${profileId}/content-filter`, {
    method: 'POST',
    body: JSON.stringify({ filters }),
  });

// Domain Block List
export const updateBlockList = (networkId: string, profileId: string, domains: string[], block = true) =>
  request(`/networks/${networkId}/profiles/${profileId}/block-list`, {
    method: 'POST',
    body: JSON.stringify({ domains, block }),
  });

// Profile Schedule
export const setProfileScheduleFull = (networkId: string, profileId: string, timeBlocks: Record<string, unknown>[]) =>
  request(`/networks/${networkId}/profiles/${profileId}/schedule/set`, {
    method: 'POST',
    body: JSON.stringify({ time_blocks: timeBlocks }),
  });

export const setWeekdayBedtime = (networkId: string, profileId: string, startTime: string, endTime: string) =>
  request(`/networks/${networkId}/profiles/${profileId}/schedule/weekday-bedtime`, {
    method: 'POST',
    body: JSON.stringify({ start_time: startTime, end_time: endTime }),
  });

export const setWeekendBedtime = (networkId: string, profileId: string, startTime: string, endTime: string) =>
  request(`/networks/${networkId}/profiles/${profileId}/schedule/weekend-bedtime`, {
    method: 'POST',
    body: JSON.stringify({ start_time: startTime, end_time: endTime }),
  });

export const clearProfileSchedule = (networkId: string, profileId: string) =>
  request(`/networks/${networkId}/profiles/${profileId}/schedule`, { method: 'DELETE' });

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

// General Settings
export const getSettings = (networkId: string) =>
  request<NetworkSettingsSummary>(`/networks/${networkId}/settings`);
