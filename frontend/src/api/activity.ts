import { request } from './client';

export const getActivity = (networkId: string) =>
  request<{ summary?: Record<string, unknown>; [key: string]: unknown }>(`/networks/${networkId}/activity`);

export const getActivityHistory = (networkId: string, period = 'day') =>
  request<{ history?: Array<Record<string, unknown>>; [key: string]: unknown }>(`/networks/${networkId}/activity/history?period=${period}`);

export const getActivityClients = (networkId: string) =>
  request<{ clients?: Array<Record<string, unknown>>; [key: string]: unknown }>(`/networks/${networkId}/activity/clients`);

export const getActivityCategories = (networkId: string) =>
  request<{ categories?: Array<Record<string, unknown>>; [key: string]: unknown }>(`/networks/${networkId}/activity/categories`);
