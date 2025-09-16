import { collection, doc, getDocs, query, setDoc, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';

const artistsCol = collection(db, 'artists');
const listingsCol = collection(db, 'NFT-listings');

export async function listArtists() {
  const snap = await getDocs(artistsCol);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function allowlistArtist({ wallet, name }: { wallet: string; name?: string }) {
  const id = wallet.toLowerCase();
  await setDoc(
    doc(artistsCol, id),
    {
      name: name || '',
      wallet,
      status: 'allowed',
      allowlisted: true,
      blocked: false,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function blockArtist(wallet: string, blocked: boolean) {
  await updateDoc(doc(artistsCol, wallet.toLowerCase()), { blocked, updatedAt: serverTimestamp() });
}

export async function listSubmittedNfts() {
  const qy = query(listingsCol, where('status', '==', 'submitted'));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function approveNft(id: string) {
  await updateDoc(doc(listingsCol, id), { status: 'approved', approvedAt: serverTimestamp() });
}

export async function rejectNft(id: string, reason?: string) {
  await updateDoc(doc(listingsCol, id), { status: 'rejected', rejectReason: reason || '', rejectedAt: serverTimestamp() });
}

export async function listListedNfts() {
  const qy = query(listingsCol, where('status', '==', 'listed'));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function setListingPaused(id: string, paused: boolean) {
  await updateDoc(doc(listingsCol, id), { paused, updatedAt: serverTimestamp() });
}
