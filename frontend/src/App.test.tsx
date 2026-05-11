import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from './App';

const getAuthStatus = vi.fn().mockResolvedValue({ authenticated: true, name: 'Tester' });
const getNetworks = vi.fn().mockResolvedValue({
  networks: [
    { id: 1, name: 'Home' },
    { id: 2, name: 'Office' },
  ],
});
const getNetwork = vi.fn().mockResolvedValue({ name: 'Home' });
const getEeros = vi.fn().mockResolvedValue({ eeros: [] });
const prefetch = vi.fn().mockResolvedValue({});
const logout = vi.fn().mockResolvedValue({});

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
    await screen.findByText('Devices');

    fireEvent.click(screen.getByRole('button', { name: 'Office' }));

    await waitFor(() => {
      expect(getNetwork).toHaveBeenCalledWith('2');
    });
  });
});
