import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { buyOne, getListingTotalSold } from '../services/marketplaceClient';
import { useWallet } from '../../../shared/hooks/useWallet';

type ListedDoc = {
  id: string;
  status: string;
  ['artist-name']?: string;
  ['artist-wallet']?: string;
  Composite?: string;
  tokenURI?: string;
  priceMatic?: string; // string for display
  maxSupply?: number;
  listingId?: string;
  paused?: boolean;
};

type TokenMeta = {
  name?: string;
  image?: string;
};

function ipfsToHttp(uri?: string) {
  if (!uri) return '';
  const cid = uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri;
  return `https://ipfs.filebase.io/ipfs/${cid}`;
}

const ExplorePage: React.FC = () => {
  const { connected, connect } = useWallet();
  const [items, setItems] = useState<ListedDoc[]>([]);
  const [meta, setMeta] = useState<Record<string, TokenMeta>>({});
  const [buying, setBuying] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);
  const [sold, setSold] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        const col = collection(db, 'NFT-listings');
        const q = query(col, where('status', '==', 'listed'));
        const snap = await getDocs(q);
        const list: ListedDoc[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        if (!cancel) setItems(list);
        // hydrate metadata and totalSold
        for (const it of list) {
          const url = ipfsToHttp(it.tokenURI);
          if (!url) continue;
          try {
            const res = await fetch(url);
            const j = await res.json();
            if (!cancel) setMeta(m => ({ ...m, [it.id]: { name: j?.name, image: j?.image ? ipfsToHttp(j.image) : undefined } }));
          } catch {}
          // totalSold via marketplace (if we have listingId)
          try {
            if (it.listingId) {
              const n = await getListingTotalSold(it.listingId);
              if (!cancel) setSold((s) => ({ ...s, [it.id]: n }));
            }
          } catch {}
        }
      } catch (e: any) {
        if (!cancel) setErr(e?.message || String(e));
      }
    })();
    return () => { cancel = true; };
  }, []);

  const onMint = async (it: ListedDoc) => {
    if (!connected) { await connect(); return; }
    try {
      setBuying(b => ({ ...b, [it.id]: true }));
      const id = BigInt(it.listingId || '0');
      if (!id) throw new Error('Missing listingId');
      const price = String(it.priceMatic || '0');
      await buyOne(id, price);
      alert('Minted 1 successfully');
    } catch (e: any) {
      const msg = e?.shortMessage || e?.reason || e?.message || String(e);
      alert('Mint failed: ' + msg);
    } finally {
      setBuying(b => ({ ...b, [it.id]: false }));
    }
  };

  return (
    <div>
      <h2 className="explore-title">Explore Listings</h2>
      {err && <div style={{ color: '#b91c1c' }}>Error: {err}</div>}
      <div className="explore-grid tiles">
        {items.map((it) => {
          const img = it.Composite ? ipfsToHttp(it.Composite) : (meta[it.id]?.image || '');
          const name = meta[it.id]?.name || 'Untitled';
          const artist = it['artist-name'] || 'Unknown';
          const minted = sold[it.id] ?? 0;
          const max = typeof it.maxSupply === 'number' ? it.maxSupply : undefined;
          const soldOut = typeof max === 'number' && minted >= max;
          return (
            <div key={it.id} className="explore-card tile">
              <div className="explore-thumb">
                <img src={img} alt={name} />
                <div className="explore-price">{it.priceMatic ?? '0'} MATIC</div>
              </div>
              <div className="explore-meta">
                <div className="explore-name" title={name}>{name}</div>
                <div className="explore-artist" title={artist}>by {artist}</div>
                {(max !== undefined || sold[it.id] !== undefined) && (
                  <div className="explore-artist" title="Total minted">
                    Total minted: {minted}{max !== undefined ? ` / ${max}` : ''}
                  </div>
                )}
                <div className="explore-actions">
                  <button className="btn" onClick={() => onMint(it)} disabled={soldOut || !!buying[it.id] || it.paused}>
                    {soldOut ? 'Sold out' : (buying[it.id] ? 'Minting…' : 'Mint')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExplorePage;
