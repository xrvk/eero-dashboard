const BASE = '/api';

interface ApiErrorBody {
  detail?: string | { message?: string };
  error?: { message?: string };
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as ApiErrorBody));
    const detail = typeof body.detail === 'string' ? body.detail : body.detail?.message;
    const message = body.error?.message || detail || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}
