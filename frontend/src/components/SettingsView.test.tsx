import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SecuritySettings } from './SettingsView';

const { getSecurity, updateSecurity } = vi.hoisted(() => ({
  getSecurity: vi.fn().mockResolvedValue({
    wpa3: false,
    band_steering: true,
    upnp: true,
    ipv6_upstream: true,
    thread: false,
  }),
  updateSecurity: vi.fn().mockResolvedValue({}),
}));

vi.mock('../api', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    getSecurity,
    updateSecurity,
  };
});

describe('SecuritySettings', () => {
  it('saves security toggle changes', async () => {
    render(<SecuritySettings networkId="1" />);

    const checkboxes = await screen.findAllByRole('checkbox');
    const checkbox = checkboxes[0];
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(updateSecurity).toHaveBeenCalled();
    });
  });
});
