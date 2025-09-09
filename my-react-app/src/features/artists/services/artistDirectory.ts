import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

export type ArtistRecord = {
  id: string;
  name: string;
  wallet: string;
};

export async function fetchArtists(): Promise<ArtistRecord[]> {
  const snap = await getDocs(collection(db, 'artists'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ArtistRecord[];
}

export async function findArtistByWallet(address: string): Promise<ArtistRecord | null> {
  if (!address) return null;
  const lower = address.toLowerCase();
  // Option B: use walletLower as the document ID
  try {
    const ref = doc(db, 'artists', lower);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as any;
      return { id: snap.id, name: data.name, wallet: data.wallet ?? address } as ArtistRecord;
    }
  } catch (e) {
    // Ignore and fall back to a collection scan below (backward compatibility)
  }
  // Backward compatibility: fall back to scanning once (optional). Remove later.
  try {
    const list = await fetchArtists();
    const found = list.find((a) => (a.wallet || '').toLowerCase() === lower) || null;
    return found ?? null;
  } catch {
    return null;
  }
}

// Optional helper: create or update an artist doc using walletLower as ID
export async function upsertArtist(record: { wallet: string; name: string }) {
  const lower = record.wallet.toLowerCase();
  await setDoc(doc(db, 'artists', lower), { name: record.name, wallet: record.wallet });
}
