import { useMemo } from 'react';
import { ARTIST_ALLOWLIST } from '../../../shared/lib/constants';
import { useWallet } from '../../../shared/hooks/useWallet';

export function useArtistProfile() {
  const { address } = useWallet();

  const normalized = useMemo(() => address?.toLowerCase() ?? null, [address]);
  const isAllowlisted = useMemo(() => {
    if (!normalized) return false;
    return ARTIST_ALLOWLIST.map((a) => a.toLowerCase()).includes(normalized);
  }, [normalized]);

  // Placeholder profile
  const profile = useMemo(() => ({
    address: address ?? '',
    displayName: address ? `Artist ${address.slice(0, 6)}` : 'Unknown Artist',
  }), [address]);

  return { profile, isArtist: isAllowlisted };
}

