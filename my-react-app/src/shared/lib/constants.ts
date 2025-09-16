export const ROUTES = {
  home: '/',
  collectors: '/collectors',
  collectorsCollection: '/collectors/collection',
  collectorsMashup: '/collectors/mashup',
  artists: '/artists',
  artistDashboard: '/artists/dashboard',
  artistCreate: '/artists/create',
  artistAssets: '/artists/assets',
  admin: '/admin',
  adminAllowlist: '/admin/allowlist',
  adminApprovals: '/admin/approvals',
  adminArtists: '/admin/artists',
  adminMinting: '/admin/minting',
} as const;

// Temporary allowlist for demo purposes. Replace with on-chain or backend check.
export const ARTIST_ALLOWLIST: string[] = [
  "0x00f33fd847d48ac64f6f8f3ff577264da59fe882"
];

// Admin wallets allow access to Admin area (dev/demo only).
// Admin access now comes from Firestore `admins/{wallet}` with `status: 'allowed'`.
