import { request } from './client';

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

export const setDeviceNickname = (networkId: string, deviceId: string, nickname: string) =>
  request(`/networks/${networkId}/devices/${deviceId}/nickname`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });

export const renameDevice = setDeviceNickname;

export const getDevicePriority = (networkId: string, deviceId: string) =>
  request<Record<string, unknown>>(`/networks/${networkId}/devices/${deviceId}/priority`);

export const setDevicePriority = (networkId: string, deviceId: string, prioritized: boolean, durationMinutes?: number) =>
  request(`/networks/${networkId}/devices/${deviceId}/priority`, {
    method: 'POST',
    body: JSON.stringify({ prioritized, duration_minutes: durationMinutes }),
  });
