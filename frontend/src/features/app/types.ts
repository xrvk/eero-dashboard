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
