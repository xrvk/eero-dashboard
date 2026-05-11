import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DeviceList from './DeviceList';

const { list, pause, block, rename } = vi.hoisted(() => ({
  list: vi.fn().mockResolvedValue({
    devices: [
      {
        mac: 'aa:bb:cc:dd:ee:ff',
        display_name: 'iPhone',
        connected: true,
        wireless: true,
        usage: { down: 0, up: 0 },
      },
    ],
  }),
  pause: vi.fn().mockResolvedValue({}),
  block: vi.fn().mockResolvedValue({}),
  rename: vi.fn().mockResolvedValue({}),
}));

vi.mock('../features/devices/client', () => ({
  devicesClient: { list, pause, block, rename },
}));

describe('DeviceList', () => {
  it('executes pause device action', async () => {
    render(<DeviceList networkId="1" />);

    await screen.findByText('iPhone');
    fireEvent.click(screen.getByTitle('Actions'));
    fireEvent.click(screen.getByText('Pause Internet'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(pause).toHaveBeenCalledWith('1', 'aa:bb:cc:dd:ee:ff', true);
    });
  });
});
