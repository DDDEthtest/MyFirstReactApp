export const POLYGON = {
  chainId: 137,
  name: 'Polygon',
  rpcUrls: ['https://polygon-rpc.com'],
  blockExplorer: 'https://polygonscan.com',
  currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
} as const;

export const POLYGON_AMOY = {
  chainId: 80002,
  name: 'Polygon Amoy',
  rpcUrls: ['https://rpc-amoy.polygon.technology'],
  blockExplorer: 'https://www.oklink.com/amoy',
  currency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
} as const;

