import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from './App';

const {
  getAuthStatus,
  getNetworks,
  getNetwork,
  getEeros,
  prefetch,
  logout,
} = vi.hoisted(() => ({
  getAuthStatus: vi.fn().mockResolvedValue({ authenticated: true, name: 'Tester' }),
  getNetworks: vi.fn().mockResolvedValue({
    networks: [
      { id: 1, name: 'Home' },
      { id: 2, name: 'Office' },
    ],
  }),
  getNetwork: vi.fn().mockResolvedValue({ name: 'Home' }),
  getEeros: vi.fn().mockResolvedValue({ eeros: [] }),
  prefetch: vi.fn().mockResolvedValue({}),
  logout: vi.fn().mockResolvedValue({}),
}));

vi.mock('./api', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    getAuthStatus,
    getNetworks,
    getNetwork,
    getEeros,
    prefetch,
    logout,
  };
});

vi.mock('./features/app/AppContent', () => ({
  default: () => <div>content</div>,
}));

describe('App', () => {
  it('loads authenticated state and allows network selection', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Devices' });

    fireEvent.click(screen.getByRole('button', { name: 'Office' }));

    await waitFor(() => {
      expect(getNetwork).toHaveBeenCalledWith('2');
    });
  });
});
