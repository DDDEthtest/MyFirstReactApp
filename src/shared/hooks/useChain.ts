import { useCallback } from 'react';
import { POLYGON, POLYGON_AMOY } from '../lib/chain';

export type ChainInfo = typeof POLYGON | typeof POLYGON_AMOY;

export const useChain = () => {
  // Default to Polygon (mainnet) for display; your app can toggle to Amoy testnet.
  const chain: ChainInfo = POLYGON;

  const switchChain = useCallback(async (target: ChainInfo) => {
    const eth = (window as any)?.ethereum;
    if (!eth?.request) return;
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${target.chainId.toString(16)}` }],
      });
    } catch (err: any) {
      // Optionally handle adding the chain
    }
  }, []);

  return { chain, switchChain };
};

