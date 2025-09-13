import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../../../shared/hooks/useWallet';
import MashupBuilder from '../../../collectors/MashupBuilder';

type OwnedNft = {
  id: string; // tokenId (string)
  image?: string;
  tokenUri?: string;
  metadata?: any;
};

type AssetLayer = { image_name: string; image_path: string; enabled: boolean };

function ipfsToHttp(uri?: string) {
  if (!uri) return '';
  const after = uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri.replace(/^https?:\/\/[^/]*\/ipfs\//i, '');
  if (/^https?:\/\//i.test(uri) && uri.includes('/ipfs/')) return uri; // already gateway
  return `https://nftstorage.link/ipfs/${after}`;
}

// Multi-gateway image with graceful fallback (mirrors MashupBuilder logic)
const primaryGateway = (process.env.REACT_APP_IPFS_PRIMARY_GATEWAY || '').trim();
const gateways = [
  // Prefer Filebase when available
  'https://ipfs.filebase.io/ipfs/',
  // Allow overriding primary via env if needed
  ...(primaryGateway ? [primaryGateway.endsWith('/') ? primaryGateway : primaryGateway + '/'] : []),
  'https://nftstorage.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
];

function makeCandidates(u?: string) {
  if (!u) return [] as string[];
  const list: string[] = [];
  const isHttp = /^https?:\/\//i.test(u);
  const hasIpfsPath = /\/ipfs\//i.test(u);
  const isBareCid = /^[a-z0-9]{46,}|^bafy[a-z0-9]{20,}/i.test(u);
  if (u.startsWith('ipfs://')) {
    let p = u.replace('ipfs://', '');
    if (p.startsWith('ipfs/')) p = p.slice(5);
    for (const g of gateways) list.push(g + p);
    return list;
  }
  if (isBareCid) {
    for (const g of gateways) list.push(g + u);
    return list;
  }
  if (isHttp && hasIpfsPath) {
    const after = u.split(/\/ipfs\//i)[1];
    if (after) {
      for (const g of gateways) list.push(g + after.replace(/^ipfs\//i, ''));
    }
  }
  list.push(u);
  if (/^http:\/\//i.test(u)) list.push(u.replace(/^http:\/\//i, 'https://'));
  return Array.from(new Set(list));
}

const MultiGatewayImg: React.FC<{ uri?: string; alt?: string; style?: React.CSSProperties }> = ({ uri, alt, style }) => {
  const [idx, setIdx] = useState(0);
  const [cands, setCands] = useState<string[]>(() => makeCandidates(uri));
  useEffect(() => { setCands(makeCandidates(uri)); setIdx(0); }, [uri]);
  if (!cands.length) return null;
  const src = cands[Math.min(idx, cands.length - 1)];
  const onError = () => setIdx((i) => Math.min(i + 1, cands.length - 1));
  if (!src) return null;
  return (
    <img src={src} alt={alt} onError={onError} referrerPolicy="no-referrer" style={style} />
  );
};

async function fetchOwnedByOwner({ apiKey, owner, contract }: { apiKey?: string; owner: string; contract: string; }) {
  const key = apiKey || (process.env.REACT_APP_ALCHEMY_API_KEY as string);
  if (!key) throw new Error('Missing REACT_APP_ALCHEMY_API_KEY for collection view');
  const base = `https://polygon-mainnet.g.alchemy.com/nft/v3/${key}`;
  const params = new URLSearchParams({ owner, withMetadata: 'true' });
  params.append('contractAddresses[]', contract);
  const url = `${base}/getNFTsForOwner?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alchemy getNFTsForOwner ${res.status}`);
  const data = await res.json();
  const out: OwnedNft[] = (data?.ownedNfts || []).map((n: any) => ({
    id: n?.tokenId,
    image: n?.image?.cachedUrl || n?.image?.originalUrl || n?.raw?.metadata?.image || n?.raw?.metadata?.image_url,
    tokenUri: n?.tokenUri?.raw || n?.tokenUri?.gateway,
    metadata: n?.raw?.metadata || n?.metadata,
  }));
  return out;
}

// Display order for asset layers in the Collection view
const PREFERRED_ORDER = ['background', 'bottom', 'upper', 'head', 'eyes', 'left_accessory', 'right_accessory', 'hat'];

export default function CollectionPage() {
  const { connected, address, connect } = useWallet();
  const [owned, setOwned] = useState<OwnedNft[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const collectionAddr = String(process.env.REACT_APP_COLLECTION_ADDRESS || '');
  // Local editable layers with toggleable `enabled`
  const [layers, setLayers] = useState<AssetLayer[]>([]);
  // Mashup display size = 70% of 552x736
  const MASHUP_BASE = { w: 552, h: 736 } as const;
  const MASHUP_SCALE = 0.7;
  const mashupW = Math.round(MASHUP_BASE.w * MASHUP_SCALE);
  const mashupH = Math.round(MASHUP_BASE.h * MASHUP_SCALE);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!connected || !address || !collectionAddr) return;
      try {
        setError(null);
        const list = await fetchOwnedByOwner({ owner: address, contract: collectionAddr });
        if (!cancel) setOwned(list);
      } catch (e: any) {
        if (!cancel) setError(e?.message || String(e));
      }
    })();
    return () => { cancel = true; };
  }, [connected, address, collectionAddr]);

  const selected = owned[Math.min(selectedIdx, Math.max(0, owned.length - 1))];

  // Rebuild layers when a different NFT is selected. Do NOT enable by default.
  useEffect(() => {
    const meta = selected?.metadata;
    const assets = Array.isArray(meta?.assets) ? meta.assets : [];
    const byKey: Record<string, string> = {};
    for (const a of assets) {
      const label = String(a?.label || a?.type || 'layer');
      const uri = String(a?.uri || a?.image || a?.src || '');
      if (uri) byKey[label] = uri;
    }
    const next: AssetLayer[] = [];
    for (const key of PREFERRED_ORDER) {
      const uri = byKey[key];
      if (uri) next.push({ image_name: key, image_path: ipfsToHttp(uri), enabled: false });
    }
    if (next.length === 0 && (selected?.image || meta?.image)) {
      const u = selected?.image || meta?.image;
      next.push({ image_name: 'composite', image_path: ipfsToHttp(u), enabled: false });
    }
    setLayers(next);
  }, [selected]);

  const toggleLayer = (name: string) => {
    setLayers((arr) => arr.map((l) => (l.image_name === name ? { ...l, enabled: !l.enabled } : l)));
  };

  if (!connected) {
    return (
      <div>
        <p>Connect your wallet to load your collection.</p>
        <button className="btn" onClick={connect}>Connect</button>
      </div>
    );
  }

  if (!process.env.REACT_APP_ALCHEMY_API_KEY) {
    return <div style={{ color: '#b91c1c' }}>Missing REACT_APP_ALCHEMY_API_KEY. Add it to .env.development.local and restart.</div>;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 300px 1fr', gap: 16 }}>
      {/* Left: Owned NFTs */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff', height: mashupH, overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>My NFTs</div>
        {error && <div style={{ color: '#b91c1c' }}>Error: {error}</div>}
        {owned.map((n, idx) => (
          <div key={n.id + ':' + idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 8, alignItems: 'center', padding: '6px 0', borderTop: '1px solid #f3f4f6' }}>
            <MultiGatewayImg uri={n.image || n.metadata?.image} alt={String(n.id)} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Token #{n.id}</div>
              <button className="btn secondary" onClick={() => setSelectedIdx(idx)} style={{ marginTop: 4 }}>View assets</button>
            </div>
          </div>
        ))}
        {owned.length === 0 && (<div>No NFTs from this collection found for this wallet.</div>)}
      </div>

      {/* Middle: Assets for selected NFT */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff', height: mashupH, overflowY: 'auto' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Assets</div>
        {layers.map((l, i) => (
          <div
            key={l.image_name + ':' + i}
            onClick={() => toggleLayer(l.image_name)}
            style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}
            title={l.enabled ? 'Click to hide from mashup' : 'Click to add to mashup'}
          >
            <div style={{ fontWeight: 600, color: l.enabled ? '#065f46' : '#111827' }}>{l.image_name}</div>
            <MultiGatewayImg
              uri={l.image_path}
              alt={l.image_name}
              style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, border: l.enabled ? '2px solid #10b981' : '1px solid #e5e7eb' }}
            />
          </div>
        ))}
        {layers.length === 0 && (<div>No asset layers found in metadata.</div>)}
      </div>

      {/* Right: Mashup preview */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <MashupBuilder layers={layers} width={mashupW} height={mashupH} background="#ffffff" style={{}} />
      </div>
    </div>
  );
}
