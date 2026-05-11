import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ProfileManager from './ProfileManager';

const { getProfiles, getDevices } = vi.hoisted(() => ({
  getProfiles: vi.fn().mockResolvedValue({
    profiles: [
      { url: '/profiles/1', name: 'Kids', paused: false, devices: [] },
      { url: '/profiles/2', name: 'Work', paused: true, devices: [] },
    ],
  }),
  getDevices: vi.fn().mockResolvedValue({ devices: [] }),
}));

vi.mock('../../api', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    getProfiles,
    getDevices,
  };
});

// Each test uses a unique networkId to avoid useFetch cache collisions
let networkCounter = 0;
afterEach(() => {
  cleanup();
  networkCounter++;
});

describe('ProfileManager', () => {
  it('renders profile list with names', async () => {
    render(<ProfileManager networkId={`net-${networkCounter}`} />);
    await screen.findByText('Kids');
    expect(screen.getByText('Work')).toBeTruthy();
  });

  it('shows profile count', async () => {
    render(<ProfileManager networkId={`net-${networkCounter}`} />);
    await screen.findByText('2 profiles');
  });

  it('shows paused badge for paused profiles', async () => {
    render(<ProfileManager networkId={`net-${networkCounter}`} />);
    await screen.findByText('Kids');
    const badges = screen.getAllByText('Paused');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no profiles', async () => {
    getProfiles.mockResolvedValueOnce({ profiles: [] });
    render(<ProfileManager networkId={`net-${networkCounter}`} />);
    await screen.findByText('No profiles configured');
  });

  it('shows device count per profile', async () => {
    getProfiles.mockResolvedValueOnce({
      profiles: [
        { url: '/profiles/1', name: 'Kids', paused: false, devices: [{}, {}] },
      ],
    });
    render(<ProfileManager networkId={`net-${networkCounter}`} />);
    await screen.findByText('2 devices');
  });
});
