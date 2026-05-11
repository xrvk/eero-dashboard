export type AppTab =
  | 'devices'
  | 'activity'
  | 'profiles'
  | 'settings-general'
  | 'settings-forwards'
  | 'settings-reservations'
  | 'settings-guest'
  | 'settings-blacklist';

export type SignalFilter = 'all' | 'excellent' | 'good' | 'fair' | 'poor';

export type BandClickFilter = 'all' | '2.4ghz' | '5ghz' | '6ghz' | 'wired';
