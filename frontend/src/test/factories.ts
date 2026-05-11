/**
 * Shared test factories — sensible defaults with overrides.
 * Usage: buildDevice({ display_name: 'iPhone', connected: true })
 */

import type { Network } from '../api/networks';
import type { Device } from '../api/devices';
import type { EeroNode } from '../api/eeros';
import type { Profile } from '../api/profiles';

let _seq = 0;
function seq() { return ++_seq; }

export function buildNetwork(overrides: Partial<Network> = {}): Network {
  const id = seq();
  return {
    id,
    url: `/networks/${id}`,
    name: `Network ${id}`,
    status: 'green',
    speed: { down: { value: 500, units: 'Mbps' }, up: { value: 50, units: 'Mbps' } },
    eeros: { count: 2 },
    clients: { count: 10 },
    ...overrides,
  };
}

export function buildDevice(overrides: Partial<Device> = {}): Device {
  const id = seq();
  return {
    url: `/devices/${id}`,
    hostname: `device-${id}`,
    display_name: `Device ${id}`,
    ip: `192.168.4.${id % 255}`,
    mac: `AA:BB:CC:DD:${String(id % 100).padStart(2, '0')}:00`,
    connection_type: 'wireless',
    connected: true,
    wireless: true,
    manufacturer: 'Apple',
    device_type: 'phone',
    ...overrides,
  };
}

export function buildEeroNode(overrides: Partial<EeroNode> = {}): EeroNode {
  const id = seq();
  return {
    url: `/eeros/${id}`,
    serial: `EERO-${id}`,
    model: 'eero Pro 6E',
    location: `Room ${id}`,
    status: 'green',
    connected_clients_count: 5,
    mesh_quality_bars: 5,
    gateway: id === 1,
    ip_address: `192.168.4.${id}`,
    mac_address: `00:11:22:33:44:${String(id % 100).padStart(2, '0')}`,
    os_version: '7.2.0',
    ...overrides,
  };
}

export function buildProfile(overrides: Partial<Profile> = {}): Profile {
  const id = seq();
  return {
    url: `/profiles/${id}`,
    name: `Profile ${id}`,
    paused: false,
    devices: [],
    ...overrides,
  };
}
