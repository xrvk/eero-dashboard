import { request } from './client';

export interface Profile {
  url?: string;
  name?: string;
  paused?: boolean;
  devices?: { url: string }[];
  [key: string]: unknown;
}

export const getProfiles = (networkId: string) =>
  request<{ profiles: Profile[] }>(`/networks/${networkId}/profiles`);

export const createProfile = (networkId: string, name: string) =>
  request<Profile>(`/networks/${networkId}/profiles`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const renameProfile = (networkId: string, profileId: string, name: string) =>
  request<Profile>(`/networks/${networkId}/profiles/${profileId}/rename`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });

export const deleteProfile = (networkId: string, profileId: string) =>
  request(`/networks/${networkId}/profiles/${profileId}`, { method: 'DELETE' });

export const pauseProfile = (networkId: string, profileId: string, paused: boolean) =>
  request(`/networks/${networkId}/profiles/${profileId}/pause`, {
    method: 'POST',
    body: JSON.stringify({ paused }),
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

