import { request } from './client';

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
