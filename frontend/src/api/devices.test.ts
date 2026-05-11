import { describe, expect, it, vi } from 'vitest';

import { renameDevice, setDeviceNickname } from './devices';

const { request } = vi.hoisted(() => ({
  request: vi.fn().mockResolvedValue({}),
}));

vi.mock('./client', () => ({ request }));

describe('devices API', () => {
  it('uses canonical nickname endpoint for rename aliases', async () => {
    await setDeviceNickname('1', 'aa:bb', 'Laptop');
    await renameDevice('1', 'aa:bb', 'Laptop');

    expect(request).toHaveBeenNthCalledWith(1, '/networks/1/devices/aa:bb/nickname', {
      method: 'POST',
      body: JSON.stringify({ nickname: 'Laptop' }),
    });
    expect(request).toHaveBeenNthCalledWith(2, '/networks/1/devices/aa:bb/nickname', {
      method: 'POST',
      body: JSON.stringify({ nickname: 'Laptop' }),
    });
  });
});
