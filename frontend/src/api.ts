const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Auth
export interface AuthStatus {
  authenticated: boolean;
  name?: string;
  email?: string;
}

export const getAuthStatus = () => request<AuthStatus>('/auth/status');

export const login = (email: string) =>
  request<{ status: string; message: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email }),
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
  speed?: { down?: { value: number; units: string }; up?: { value: number; units: string } };
  eeros?: { count: number };
  clients?: { count: number };
  gateway_eero?: string;
  [key: string]: unknown;
}

export const getNetworks = () =>
  request<{ networks: Network[] }>('/networks');

export const getNetwork = (id: string) =>
  request<Network>(`/networks/${id}`);

// Devices
export interface Device {
  url?: string;
  hostname?: string;
  display_name?: string;
  ip?: string;
  mac?: string;
  connection_type?: string;
  connected?: boolean;
  wireless?: boolean;
  manufacturer?: string;
  device_type?: string;
  profile?: { url?: string; name?: string };
  usage?: { down?: number; up?: number };
  [key: string]: unknown;
}

export const getDevices = (networkId: string) =>
  request<{ devices: Device[] }>(`/networks/${networkId}/devices`);

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

export const getProfiles = (networkId: string) =>
  request<{ profiles: Profile[] }>(`/networks/${networkId}/profiles`);

// Activity
export const getActivity = (networkId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/activity`);

export const getActivityHistory = (networkId: string, period = 'day') =>
  request<Record<string, unknown>>(`/networks/${networkId}/activity/history?period=${period}`);

export const getActivityClients = (networkId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/activity/clients`);

export const getActivityCategories = (networkId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/activity/categories`);

// Speed Test
export const runSpeedTest = (networkId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/speed-test`, { method: 'POST' });

// Diagnostics
export const getDiagnostics = (networkId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/diagnostics`);

export const runDiagnostics = (networkId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/diagnostics`, { method: 'POST' });

// Device Actions
export const pauseDevice = (networkId: string, deviceId: string, paused: boolean) =>
  request(`/networks/${networkId}/devices/${deviceId}/pause`, {
    method: 'POST',
    body: JSON.stringify({ paused }),
  });

export const blockDevice = (networkId: string, deviceId: string, blocked: boolean) =>
  request(`/networks/${networkId}/devices/${deviceId}/block`, {
    method: 'POST',
    body: JSON.stringify({ blocked }),
  });

export const renameDevice = (networkId: string, deviceId: string, nickname: string) =>
  request(`/networks/${networkId}/devices/${deviceId}/rename`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });

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
export interface SecuritySettings {
  [key: string]: unknown;
}

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
  request<Record<string, unknown>>(`/networks/${networkId}/dns`);

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
  request<Record<string, unknown>>(`/networks/${networkId}/forwards`);

export const createForward = (networkId: string, data: {
  ip: string; gateway_port: number; client_port: number; protocol?: string; description?: string; enabled?: boolean;
}) =>
  request(`/networks/${networkId}/forwards`, { method: 'POST', body: JSON.stringify(data) });

export const deleteForward = (networkId: string, forwardId: string) =>
  request(`/networks/${networkId}/forwards/${forwardId}`, { method: 'DELETE' });

export const getReservations = (networkId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/reservations`);

export const createReservation = (networkId: string, data: { ip: string; mac: string; description?: string }) =>
  request(`/networks/${networkId}/reservations`, { method: 'POST', body: JSON.stringify(data) });

export const deleteReservation = (networkId: string, reservationId: string) =>
  request(`/networks/${networkId}/reservations/${reservationId}`, { method: 'DELETE' });

// Reboot
export const rebootEero = (networkId: string, eeroId: string) =>
  request(`/networks/${networkId}/eeros/${eeroId}/reboot`, { method: 'POST' });
