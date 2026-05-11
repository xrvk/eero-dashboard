import type { JSX } from 'react';
import {
  Smartphone, Tablet, Laptop, Monitor, Tv, Speaker, Camera, Printer, Gamepad2,
  Globe,
} from 'lucide-react';
import type { Device } from '../../api';

export interface DeviceConnectivity {
  signal?: string;
  score?: number;
  score_bars?: number;
  frequency?: number;
  rx_rate_info?: { rate_bps?: number; channel_width?: string; phy_type?: string };
}

export function getConn(d: Device): DeviceConnectivity | undefined {
  return (d as Record<string, unknown>).connectivity as DeviceConnectivity | undefined;
}

export function freqToBand(freq?: number): string {
  if (!freq) return '—';
  if (freq < 3000) return '2.4 GHz';
  if (freq < 5900) return '5 GHz';
  return '6 GHz';
}

export function formatRate(bps?: number): string {
  if (!bps) return '—';
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(0)} Mbps`;
  return `${(bps / 1_000).toFixed(0)} Kbps`;
}

export function getDeviceIcon(d: Device): JSX.Element {
  const name = (d.display_name || d.hostname || '').toLowerCase();
  const type = (d.device_type || '').toLowerCase();
  if (type.includes('phone') || name.includes('iphone') || name.includes('pixel') || name.includes('galaxy')) return <Smartphone size={20} />;
  if (type.includes('tablet') || name.includes('ipad')) return <Tablet size={20} />;
  if (type.includes('laptop') || name.includes('macbook') || name.includes('laptop')) return <Laptop size={20} />;
  if (type.includes('desktop') || name.includes('imac') || name.includes('mac-pro')) return <Monitor size={20} />;
  if (type.includes('tv') || name.includes('apple-tv') || name.includes('roku') || name.includes('fire')) return <Tv size={20} />;
  if (type.includes('speaker') || name.includes('echo') || name.includes('homepod') || name.includes('sonos')) return <Speaker size={20} />;
  if (type.includes('camera') || name.includes('cam')) return <Camera size={20} />;
  if (type.includes('printer')) return <Printer size={20} />;
  if (name.includes('switch') || name.includes('playstation') || name.includes('xbox') || name.includes('nintendo')) return <Gamepad2 size={20} />;
  return <Globe size={20} />;
}
