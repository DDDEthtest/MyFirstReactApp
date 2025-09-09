import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../../../shared/hooks/useWallet';
import { findArtistByWallet, ArtistRecord } from '../services/artistDirectory';

export function useArtistProfile() {
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [record, setRecord] = useState<ArtistRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!address) { setRecord(null); return; }
      try {
        setLoading(true);
        const r = await findArtistByWallet(address);
        if (!cancelled) setRecord(r);
      } catch (e) {
        // Swallow errors and treat as not found; loading state will end.
        if (!cancelled) setRecord(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  const isArtist = !!record;
  const profile = useMemo(() => ({
    address: address ?? '',
    displayName: record?.name || (address ? `Artist ${address.slice(0, 6)}` : 'Unknown Artist'),
  }), [address, record]);

  return { profile, isArtist, loading };
}
