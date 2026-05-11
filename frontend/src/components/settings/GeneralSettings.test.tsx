import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GeneralSettings } from './GeneralSettings';

const { getSettings, getPassword, getSqm, getDns, getSecurity, getUpdates, getThread, getRouting, getEeros } = vi.hoisted(() => ({
  getSettings: vi.fn().mockResolvedValue({
    name: 'TestNetwork',
    wan_ip: '1.2.3.4',
    gateway_ip: '192.168.1.1',
    timezone: 'America/New_York',
  }),
  getPassword: vi.fn().mockResolvedValue({ password: 'secret123' }),
  getSqm: vi.fn().mockResolvedValue({ enabled: false }),
  getDns: vi.fn().mockResolvedValue({ dns: { mode: 'default', caching: true } }),
  getSecurity: vi.fn().mockResolvedValue({ wpa3: true, band_steering: true, upnp: false }),
  getUpdates: vi.fn().mockResolvedValue({}),
  getThread: vi.fn().mockResolvedValue({}),
  getRouting: vi.fn().mockResolvedValue({}),
  getEeros: vi.fn().mockResolvedValue({ eeros: [] }),
}));

vi.mock('../../api', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    getSettings,
    getPassword,
    getSqm,
    getDns,
    getSecurity,
    getUpdates,
    getThread,
    getRouting,
    getEeros,
  };
});

describe('GeneralSettings', () => {
  it('renders network name and key sections', async () => {
    render(<GeneralSettings networkId="1" />);

    expect(await screen.findByText('TestNetwork')).toBeDefined();
    expect(screen.getByText('Network')).toBeDefined();
    expect(screen.getByText('Wi-Fi Password')).toBeDefined();
  });
});
