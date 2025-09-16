import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { useWallet } from '../../../shared/hooks/useWallet';

// Admin check is backed by Firestore collection `admins`.
// Document ID must equal the lowercased wallet address, and field `status` must be 'allowed'.
export function useAdmin() {
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalized = useMemo(() => address?.toLowerCase() ?? null, [address]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!normalized) { setIsAdmin(false); return; }
      try {
        setLoading(true);
        setError(null);
        // Simple rule: if a document exists at admins/{lowercasedWallet}, grant access
        const ref = doc(db, 'admins', normalized);
        const snap = await getDoc(ref);
        if (!cancel) setIsAdmin(snap.exists());
      } catch (e: any) {
        if (!cancel) {
          setIsAdmin(false);
          setError(e?.message || String(e));
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [normalized]);

  return { isAdmin, loading, error };
}
