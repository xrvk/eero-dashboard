export interface SqmSettings {
  enabled?: boolean;
  mode?: string;
  upload_bandwidth_mbps?: number;
  download_bandwidth_mbps?: number;
  [key: string]: unknown;
}

export interface GuestNetworkSettings {
  enabled?: boolean;
  name?: string;
  password?: string;
}

export interface DnsCustomConfig {
  ips?: string[];
}

export interface DnsSettingsData {
  mode?: string;
  caching?: boolean;
  custom?: DnsCustomConfig;
  [key: string]: unknown;
}

export interface FirmwareUpdate {
  title?: string;
  status?: string;
  [key: string]: unknown;
}
