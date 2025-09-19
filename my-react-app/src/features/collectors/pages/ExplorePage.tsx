import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { buyOneAutoURI, getListingTotalSold } from '../services/marketplaceClient';
import { useWallet } from '../../../shared/hooks/useWallet';
import MashupBuilder from '../../../collectors/MashupBuilder';

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
  const [assets, setAssets] = useState<Record<string, { image_name: string; image_path: string; enabled: boolean }[]>>({});
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const [previewLayers, setPreviewLayers] = useState<{ image_name: string; image_path: string; enabled: boolean }[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(null);
        const col = collection(db, 'NFT-listings');
        const activeMarketplace = String(process.env.REACT_APP_MARKETPLACE_ADDRESS || '');
        const activeChainId = Number(process.env.REACT_APP_CHAIN_ID || '137');
        // Filter to the current marketplace + chain to avoid showing stale listings
        const q = query(
          col,
          where('status', '==', 'listed'),
          where('marketplace', '==', activeMarketplace),
          where('chainId', '==', activeChainId)
        );
        const snap = await getDocs(q);
        const list: ListedDoc[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        if (!cancel) setItems(list);
        // hydrate metadata, assets and totalSold
        for (const it of list) {
          const url = ipfsToHttp(it.tokenURI);
          if (!url) continue;
          try {
            const res = await fetch(url);
            const j = await res.json();
            if (!cancel) {
              setMeta(m => ({ ...m, [it.id]: { name: j?.name, image: j?.image ? ipfsToHttp(j.image) : undefined } }));
              const PREFERRED_ORDER = ['background', 'bottom', 'upper', 'head', 'eyes', 'hat', 'hair', 'left_accessory', 'right_accessory'];
              const listA: { image_name: string; image_path: string; enabled: boolean }[] = [];
              const arr: any[] = Array.isArray(j?.assets) ? j.assets : [];
              const byKey: Record<string, string> = {};
              for (const a of arr) {
                const label = String(a?.label || a?.type || 'layer').toLowerCase().replace(/[\s-]+/g, '_');
                const u = String(a?.uri || a?.image || a?.src || '');
                if (u) byKey[label] = u;
              }
              for (const k of PREFERRED_ORDER) {
                const u = byKey[k];
                if (u) listA.push({ image_name: k, image_path: ipfsToHttp(u), enabled: true });
              }
              setAssets((old) => ({ ...old, [it.id]: listA }));
            }
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
      await buyOneAutoURI(id, price);
      alert('Minted 1 successfully');

      // optimistic refresh of totalSold
      try {
        if (it.listingId) {
          const n = await getListingTotalSold(it.listingId);
          setSold((s) => ({ ...s, [it.id]: n }));
        }
      } catch {}
    } catch (e: any) {
      const msg = e?.shortMessage || e?.reason || e?.message || String(e);
      alert('Mint failed: ' + msg);
    } finally {
      setBuying(b => ({ ...b, [it.id]: false }));
    }
  };

  const openPreview = (it: ListedDoc) => {
    const layers = (assets[it.id] || []).map(l => ({ ...l, enabled: true }));
    setPreviewLayers(layers);
    setPreviewFor(it.id);
  };

  const togglePreviewLayer = (name: string) => {
    setPreviewLayers(prev => prev.map(l => l.image_name === name ? { ...l, enabled: !l.enabled } : l));
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
              <div className="explore-thumb" onClick={() => openPreview(it)} title="Preview">
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
                  <button
                    className={`btn${soldOut ? ' soldout' : ''}`}
                    onClick={() => onMint(it)}
                    disabled={soldOut || !!buying[it.id] || it.paused}
                  >
                    {soldOut ? 'Sold out' : (buying[it.id] ? 'Minting…' : 'Mint')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {previewFor && (
        <div className="overlay-full" role="dialog" aria-modal="true">
          <div className="overlay-content">
            <div className="overlay-left">
              <MashupBuilder layers={previewLayers} width={420} height={560} background="#ffffff" style={{}} />
            </div>
            <div className="overlay-right">
              <div className="overlay-header">
                <div className="name">{meta[previewFor]?.name || 'Untitled'}</div>
                <div className="artist">by {(items.find(x => x.id === previewFor)?.['artist-name']) || 'Unknown'}</div>
                {(() => { const s = sold[previewFor] ?? 0; const max = items.find(x => x.id===previewFor)?.maxSupply; return (
                  <div className="minted">Total minted: {s}{typeof max==='number' ? ` / ${max}`: ''}</div>
                ); })()}
                {(() => { const s = sold[previewFor] ?? 0; const max = items.find(x => x.id===previewFor)?.maxSupply; const so = typeof max==='number' && s>=max; const it = items.find(x => x.id===previewFor)!; return (
                  <div style={{ marginTop: 8 }}>
                    <button className={`btn${so ? ' soldout' : ''}`} disabled={so || !!buying[previewFor] || it?.paused} onClick={() => onMint(it)}>{so ? 'Sold out' : (buying[previewFor] ? 'Minting…' : 'Mint')}</button>
                  </div>
                ); })()}
              </div>
              <div className="overlay-list">
                {(assets[previewFor] || []).map((a, i) => (
                  <div key={a.image_name + i} className={`asset-card${previewLayers.find(l => l.image_name===a.image_name && l.enabled) ? ' active' : ''}`} onClick={() => togglePreviewLayer(a.image_name)}>
                    <img className="asset-img" src={a.image_path} alt={a.image_name} />
                    <div className="asset-title">{a.image_name}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="overlay-close btn secondary" onClick={() => setPreviewFor(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;

