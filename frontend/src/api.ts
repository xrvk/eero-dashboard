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
  url: string;
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
