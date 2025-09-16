import React, { useEffect, useMemo, useRef, useState } from 'react';
import MashupBuilder from '../../../collectors/MashupBuilder';
import { useWallet } from '../../../shared/hooks/useWallet';
import ColorPanel from '../components/ColorPanel';

type OwnedNft = {
  id: string;
  name?: string;
  image?: string;
  metadata?: any;
};

// Helper: build multiple gateway candidates when an IPFS URL appears
function makeCandidates(u?: string) {
  if (!u) return [] as string[];
  const gateways = [
    'https://ipfs.filebase.io/ipfs/',
    'https://nftstorage.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
  ];
  const list: string[] = [];
  if (u.startsWith('ipfs://')) {
    let p = u.replace('ipfs://', '');
    if (p.startsWith('ipfs/')) p = p.slice(5);
    for (const g of gateways) list.push(g + p);
  } else if (/^https?:\/\//i.test(u) && /\/ipfs\//i.test(u)) {
    const after = u.split(/\/ipfs\//i)[1];
    if (after) for (const g of gateways) list.push(g + after.replace(/^ipfs\//i, ''));
    list.push(u);
  } else {
    list.push(u);
  }
  return Array.from(new Set(list));
}

const MultiGatewayImg: React.FC<{ uri?: string; alt?: string; className?: string }>
  = ({ uri, alt, className }) => {
  const [idx, setIdx] = useState(0);
  const [cands, setCands] = useState<string[]>(() => makeCandidates(uri));
  useEffect(() => { setCands(makeCandidates(uri)); setIdx(0); }, [uri]);
  if (!cands.length) return null;
  const src = cands[Math.min(idx, cands.length - 1)];
  const onError = () => setIdx((i) => Math.min(i + 1, cands.length - 1));
  return <img className={className} src={src} alt={alt} onError={onError} referrerPolicy="no-referrer" />;
};

async function fetchOwnedAll({ apiKey, owner }: { apiKey?: string; owner: string; }) {
  const key = apiKey || (process.env.REACT_APP_ALCHEMY_API_KEY as string);
  if (!key) throw new Error('Missing REACT_APP_ALCHEMY_API_KEY for mashup');
  const base = `https://polygon-mainnet.g.alchemy.com/nft/v3/${key}`;
  const params = new URLSearchParams({ owner, withMetadata: 'true' });
  const url = `${base}/getNFTsForOwner?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alchemy getNFTsForOwner ${res.status}`);
  const data = await res.json();
  const out: OwnedNft[] = (data?.ownedNfts || []).map((n: any) => ({
    id: n?.tokenId || n?.id?.tokenId || Math.random().toString(36).slice(2),
    name: n?.title || n?.raw?.metadata?.name,
    image: n?.image?.cachedUrl || n?.image?.originalUrl || n?.raw?.metadata?.image || n?.media?.[0]?.gateway,
    metadata: n?.raw?.metadata || n?.metadata,
  }));
  return out;
}

async function fetchOwnedByContract({ apiKey, owner, contract }: { apiKey?: string; owner: string; contract: string; }) {
  const key = apiKey || (process.env.REACT_APP_ALCHEMY_API_KEY as string);
  if (!key) throw new Error('Missing REACT_APP_ALCHEMY_API_KEY for mashup');
  const base = `https://polygon-mainnet.g.alchemy.com/nft/v3/${key}`;
  const params = new URLSearchParams({ owner, withMetadata: 'true' });
  params.append('contractAddresses[]', contract);
  const url = `${base}/getNFTsForOwner?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alchemy getNFTsForOwner ${res.status}`);
  const data = await res.json();
  const out: OwnedNft[] = (data?.ownedNfts || []).map((n: any) => ({
    id: n?.tokenId || n?.id?.tokenId || Math.random().toString(36).slice(2),
    name: n?.title || n?.raw?.metadata?.name,
    image: n?.image?.cachedUrl || n?.image?.originalUrl || n?.raw?.metadata?.image || n?.media?.[0]?.gateway,
    metadata: n?.raw?.metadata || n?.metadata,
  }));
  return out;
}

const TABS = [
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'head', label: 'Head' },
  { key: 'eyes', label: 'Eyes' },
  { key: 'upper', label: 'Upper' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'hair', label: 'Hair' },
  { key: 'hat', label: 'Hat' },
  { key: 'left_accessory', label: 'Left accessory' },
  { key: 'right_accessory', label: 'Right accessory' },
];

const MashupPage: React.FC = () => {
  const { connected, address, connect } = useWallet();
  const [owned, setOwned] = useState<OwnedNft[]>([]);
  const [active, setActive] = useState<string>('collectibles');
  const collectionAddr = String(process.env.REACT_APP_COLLECTION_ADDRESS || '').trim();
  const PLACEHOLDER_COUNT = 30; // for UX scroll testing
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [vh, setVh] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 0);
  const [headerH, setHeaderH] = useState<number>(64);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [navH, setNavH] = useState<number>(40);

  // canvas size (same ratio as Collection)
  const base = { w: 552, h: 736 } as const;
  const scale = 0.7;
  const wDesktop = Math.round(base.w * scale);
  const hDesktop = Math.round(base.h * scale);

  // Track viewport width to switch sticky offsets
  useEffect(() => {
    const measure = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      const hdr = document.querySelector('.collectors-header') as HTMLElement | null;
      setHeaderH(hdr?.offsetHeight || 64);
      setNavH(navRef.current?.offsetHeight || 40);
    };
    const onResize = () => measure();
    measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isDesktop = vw >= 1024;

  // Mobile dynamic canvas size to occupy 50% of screen for (header + canvas + nav)
  const desiredTop = Math.max(220, Math.floor(vh * 0.5));
  const mobileCanvasH = Math.max(160, desiredTop - headerH - navH - 12);
  const aspect = base.w / base.h; // ~0.75
  const mobileCanvasW = Math.min(Math.floor(mobileCanvasH * aspect), Math.max(240, vw - 32));
  const w = isDesktop ? wDesktop : mobileCanvasW;
  const h = isDesktop ? hDesktop : mobileCanvasH;

  // Mashup layers and asset selection panel
  type AssetLayer = { image_name: string; image_path: string; enabled: boolean };
  const [mashLayers, setMashLayers] = useState<AssetLayer[]>([]);
  const [candidates, setCandidates] = useState<AssetLayer[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [assetsByCategory, setAssetsByCategory] = useState<Record<string, AssetLayer[]>>({});
  // Layer draw order: background behind all, then bottom -> ... -> right_accessory
  const PREFERRED_ORDER = ['background', 'bottom', 'upper', 'head', 'eyes', 'hat', 'hair', 'left_accessory', 'right_accessory'];

  // Color controls for SVG-tintable layers
  const [baseColor, setBaseColor] = useState<string>('#00ff00');
  const [eyesColor, setEyesColor] = useState<string>('#ffff00');
  const [hairColor, setHairColor] = useState<string>('#0000ff');
  const [activePicker, setActivePicker] = useState<null | 'base' | 'eyes' | 'hair'>(null);

  function ipfsToHttp(uri?: string) {
    if (!uri) return '';
    const after = uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri.replace(/^https?:\/\/[^/]*\/ipfs\//i, '');
    if (/^https?:\/\//i.test(uri) && uri.includes('/ipfs/')) return uri; // already gateway
    return `https://ipfs.filebase.io/ipfs/${after}`;
  }

  const onCollectibleClick = (n: OwnedNft) => {
    const meta = n?.metadata || {};
    const assets = Array.isArray(meta?.assets) ? meta.assets : [];
    const byKey: Record<string, string> = {};
    for (const a of assets) {
      const label = String(a?.label || a?.type || 'layer')
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
      const uri = String(a?.uri || a?.image || a?.src || '');
      if (uri) byKey[label] = uri;
    }
    const next: AssetLayer[] = [];
    for (const key of PREFERRED_ORDER) {
      const uri = byKey[key];
      if (uri) next.push({ image_name: key, image_path: ipfsToHttp(uri), enabled: false });
    }
    if (next.length === 0 && (n?.image || meta?.image)) {
      next.push({ image_name: 'composite', image_path: ipfsToHttp(n?.image || meta?.image), enabled: false });
    }
    setCandidates(next);
    setPanelOpen(true);
  };

  const toggleLayer = (name: string, path: string) => {
    const orderIndex = (n: string) => {
      const i = PREFERRED_ORDER.indexOf((n || '').toLowerCase());
      return i === -1 ? 999 : i;
    };
    const sortByOrder = (arr: AssetLayer[]) => arr.slice().sort((a, b) => orderIndex(a.image_name) - orderIndex(b.image_name));

    setMashLayers(prev => {
      const idxByName = prev.findIndex(l => (l.image_name || '').toLowerCase() === (name || '').toLowerCase());
      if (idxByName >= 0) {
        const existing = prev[idxByName];
        // Same asset toggles on/off; different asset replaces within same layer slot
        const updated = prev.slice();
        if (existing.image_path === path) {
          updated[idxByName] = { ...existing, enabled: !existing.enabled };
        } else {
          updated[idxByName] = { image_name: name, image_path: path, enabled: true };
        }
        return sortByOrder(updated);
      }
      return sortByOrder(prev.concat([{ image_name: name, image_path: path, enabled: true }]));
    });

    // Reflect selection in the candidate list: only one active per layer name
    setCandidates(cs => cs.map(c => {
      if ((c.image_name || '').toLowerCase() !== (name || '').toLowerCase()) return c;
      if (c.image_path === path) return { ...c, enabled: !c.enabled };
      return { ...c, enabled: false };
    }));
  };

  // Build a cross-collection catalog of assets by canonical category
  useEffect(() => {
    const map: Record<string, AssetLayer[]> = {};
    const add = (name: string, uri: string) => {
      const key = (name || '').toLowerCase();
      if (!PREFERRED_ORDER.includes(key)) return;
      const path = ipfsToHttp(uri);
      if (!path) return;
      const arr = map[key] || (map[key] = []);
      // Avoid duplicates by image path
      if (!arr.some((e) => e.image_path === path)) {
        arr.push({ image_name: key, image_path: path, enabled: false });
      }
    };
    for (const n of owned) {
      const meta: any = n?.metadata || {};
      const assets: any[] = Array.isArray(meta?.assets) ? meta.assets : [];
      for (const a of assets) {
        const label = String(a?.label || a?.type || 'layer').toLowerCase().replace(/[\s-]+/g, '_');
        const uri = String(a?.uri || a?.image || a?.src || '');
        if (label && uri) add(label, uri);
      }
    }
    setAssetsByCategory(map);
  }, [owned]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!connected || !address) return;
      try {
        const list = collectionAddr
          ? await fetchOwnedByContract({ owner: address, contract: collectionAddr })
          : await fetchOwnedAll({ owner: address });
        if (!cancel) setOwned(list);
      } catch (e) {
        // Silent for now
      }
    })();
    return () => { cancel = true; };
  }, [connected, address, collectionAddr]);

  if (!connected) {
    return (
      <div>
        <button className="btn" onClick={connect}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="mashup-layout">
      {/* Sticky canvas/top block */}
      <div className="mashup-left" style={{ width: isDesktop ? w : 'auto', top: headerH }}>
        <div className="mashup-sticky" style={{ top: headerH }}>
          <div className="mashup-canvas">
            <MashupBuilder
              layers={mashLayers}
              width={w}
              height={h}
              background="#ffffff"
              style={{}}
              colorMap={{
                bottom: baseColor,
                upper: baseColor,
                face: baseColor,
                head: baseColor,
                eyes: eyesColor,
                hair: hairColor,
              }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable navbar */}
      <div className="mashup-right">
        <nav
          className="nav-tabs nav-sticky"
          aria-label="Mashup tabs"
          ref={navRef as any}
          style={{ top: isDesktop ? headerH : headerH + h + 12, marginTop: 8 }}
        >
          {TABS.map(t => (
            <React.Fragment key={t.key}>
              <button
                className={`nav-tab${active === t.key ? ' active' : ''}`}
                onClick={() => setActive(t.key)}
              >
                {t.label}
              </button>
              {t.key === 'right_accessory' && (
                <div style={{ display: 'inline-flex', gap: 10, marginLeft: 10 }}>
                  <ColorSwatchButton
                    color={baseColor}
                    title="Base color (bottom, upper, face)"
                    onClick={() => setActivePicker(p => p === 'base' ? null : 'base')}
                  />
                  <ColorSwatchButton
                    color={eyesColor}
                    title="Eyes color"
                    onClick={() => setActivePicker(p => p === 'eyes' ? null : 'eyes')}
                  />
                  <ColorSwatchButton
                    color={hairColor}
                    title="Hair color"
                    onClick={() => setActivePicker(p => p === 'hair' ? null : 'hair')}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>

      {/* Asset panel: shows selected collectible assets or specific category */}
      {(panelOpen || active !== 'collectibles') && (
        <div
          className="asset-panel"
          style={{ top: isDesktop ? headerH + navH + 8 : headerH + h + navH + 16 }}
        >
          <div className="asset-grid">
            {(active === 'collectibles'
              ? candidates
              : (assetsByCategory[active] || [])
            ).map((l, i) => {
              const isOn = !!mashLayers.find(ml => (
                (ml.image_name || '').toLowerCase() === (l.image_name || '').toLowerCase() &&
                ml.image_path === l.image_path && ml.enabled
              ));
              const item = { ...l, enabled: isOn };
              return (
              <div
                key={item.image_name + ':' + item.image_path + ':' + i}
                className={`asset-card${item.enabled ? ' active' : ''}`}
                onClick={() => toggleLayer(item.image_name, item.image_path)}
                title={item.enabled ? 'Click to hide from mashup' : 'Click to add to mashup'}
              >
                <MultiGatewayImg uri={item.image_path} alt={item.image_name} className="asset-img" />
              </div>
            );})}
          </div>
          {candidates.length === 0 && (
            <div style={{ padding: '6px 4px', color: '#6b7280' }}>
              Select a collectible to view available assets.
            </div>
          )}
        </div>
      )}

      {/* Content area under navbar */}
      {activePicker ? (
        <div className="color-panel" style={{ marginTop: 8 }}>
          <ColorPanel
            color={activePicker === 'base' ? baseColor : activePicker === 'eyes' ? eyesColor : hairColor}
            onChange={(hex) => {
              if (activePicker === 'base') setBaseColor(hex);
              else if (activePicker === 'eyes') setEyesColor(hex);
              else setHairColor(hex);
            }}
            onClose={() => setActivePicker(null)}
          />
        </div>
      ) : (
        active === 'collectibles' ? (
          <div className="thumb-grid">
            {owned.map((n) => (
              <div key={n.id} className="thumb-card" title={n.name || `#${n.id}`} onClick={() => onCollectibleClick(n)}>
                <MultiGatewayImg className="thumb-img" uri={n.image} alt={n.name || String(n.id)} />
              </div>
            ))}
            {/* Placeholders for UX/scroll behavior preview */}
              {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
                <div key={`ph-${i}`} className="thumb-card placeholder">
                  <div className="thumb-img placeholder" />
                </div>
              ))}
            {owned.length === 0 && (
              <div style={{ color: '#6b7280' }}>
                {collectionAddr ? 'No collectibles from this collection found for this wallet.' : 'No collectibles found for this wallet.'}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '12px 0', color: '#6b7280' }}>No items available for this tab yet.</div>
        )
      )}
      </div>
    </div>
  );
};

export default MashupPage;

// Small colored square button used in navbar
const ColorSwatchButton: React.FC<{ color: string; title?: string; onClick?: () => void }>
  = ({ color, title, onClick }) => {
  return (
    <button
      type="button"
      className="color-swatch-btn"
      onClick={onClick}
      title={title}
      style={{
        width: 44, height: 44, borderRadius: 12, border: '1px solid #1f2937', background: '#111827', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <span style={{ display: 'inline-block', width: 26, height: 26, borderRadius: 8, background: color, boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.25)' }} />
    </button>
  );
};
