export const ROUTES = {
  home: '/',
  collectors: '/collectors',
  collectorsCollection: '/collectors/collection',
  collectorsMashup: '/collectors/mashup',
  artists: '/artists',
  artistDashboard: '/artists/dashboard',
  artistCreate: '/artists/create',
  artistAssets: '/artists/assets',
} as const;

// Temporary allowlist for demo purposes. Replace with on-chain or backend check.
export const ARTIST_ALLOWLIST: string[] = [
  "0x00f33fd847d48ac64f6f8f3ff577264da59fe882"
];
