import { request } from './client';
import { prefetchRequest } from '../hooks/useFetch';

export interface EeroNode {
  url?: string;
  serial?: string;
  model?: string;
  model_number?: string;
  location?: string;
  status?: string;
  connected_clients_count?: number;
  mesh_quality_bars?: number;
  gateway?: boolean;
  ip_address?: string;
  mac_address?: string;
  os_version?: string;
  ethernet?: boolean;
  wired?: boolean;
  connection_type?: string;
  last_reboot?: string;
  update_available?: boolean;
  hardware_rev?: string;
  nightlight?: {
    enabled?: boolean;
    brightness?: number;
    schedule?: { enabled?: boolean; on?: string; off?: string };
    ambient_light_enabled?: boolean;
  };
  led_on?: boolean;
  led_brightness?: number;
  [key: string]: unknown;
}

export const getEeros = (networkId: string) =>
  request<{ eeros: EeroNode[] }>(`/networks/${networkId}/eeros`);

export const getEero = (networkId: string, eeroId: string) =>
  request<EeroNode>(`/networks/${networkId}/eeros/${eeroId}`);

export const prefetchEero = (networkId: string, eeroId: string) => {
  const path = `/networks/${networkId}/eeros/${eeroId}`;
  prefetchRequest(path, () => request<EeroNode>(path));
};

// Reboot
export const rebootEero = (networkId: string, eeroId: string) =>
  request(`/networks/${networkId}/eeros/${eeroId}/reboot`, { method: 'POST' });

// LED
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
