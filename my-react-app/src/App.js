import React, { useEffect, useState } from 'react';
import './App.css';
import LoadMultiAssetNFT, { LoadTokenAssetsERC5773, LoadTokenChildrenERC7401 } from './component';

// Start with the previously shared contract; you can switch by clicking a card below.
const DEFAULT_CONTRACT = '0x2499809520bb9A8847a82Fb51126c3483eE87d14';

function App() {
  const [contract, setContract] = useState(DEFAULT_CONTRACT);
  const [items, setItems] = useState([]); // { image, contractAddress, tokenId, title }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assetsByToken, setAssetsByToken] = useState({}); // tokenId(hex) -> [{ image, name, metaUri }]
  const [childrenByToken, setChildrenByToken] = useState({}); // tokenId(hex) -> [{image,contractAddress,tokenId}]
  const [loadingTokenId, setLoadingTokenId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await LoadMultiAssetNFT(contract, { maxCount: 1000, includeDetails: true });
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contract]);

  const handleFocusCollection = (addr) => {
    if (addr && addr !== contract) setContract(addr);
  };

  const handleShowAssets = async (addr, tokenIdHex) => {
    try {
      setLoadingTokenId(tokenIdHex);
      const items = await LoadTokenAssetsERC5773(addr, tokenIdHex, {});
      setAssetsByToken((m) => ({ ...m, [tokenIdHex]: items }));
      // If no multi-assets found, try nested children (ERC-7401)
      if (!items || items.length === 0) {
        const kids = await LoadTokenChildrenERC7401(addr, tokenIdHex, {});
        setChildrenByToken((m) => ({ ...m, [tokenIdHex]: kids }));
      }
    } catch (e) {
      console.error('LoadTokenAssetsERC5773 failed', e);
      alert('Failed to load assets for token: ' + (e?.message || e));
    } finally {
      setLoadingTokenId(null);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading images…</div>;
  if (error) return (
    <div style={{ padding: 16, color: 'crimson' }}>
      Error: {error}
      <div style={{ marginTop: 8, color: '#444' }}>
        Ensure REACT_APP_ALCHEMY_API_KEY is set and the contract is valid.
      </div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>NFT Images ({items.length})</h2>
      <div style={{ marginBottom: 12, fontFamily: 'monospace' }}>Current contract: {contract}</div>
      <PasteUrlSwitcher items={items} onPickContract={handleFocusCollection} />
      {items.length === 0 && <div>No images found.</div>}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12
      }}>
        {items.map((item, idx) => (
          <div key={(item.image || idx) + String(idx)} style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', background: '#fafafa' }}>
            <img src={item.image} alt={`NFT ${idx}`} style={{ width: '100%', height: 200, objectFit: 'contain', display: 'block', background: '#fff' }} />
            <div style={{ padding: 8, fontSize: 12, wordBreak: 'break-all' }}>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>{item.title || 'Untitled NFT'}</div>
              <div>Contract: {item.contractAddress}</div>
              <div>Token ID: {item.tokenId}</div>
              <button style={{ marginTop: 8 }} onClick={() => handleShowAssets(item.contractAddress, item.tokenId)}>
                {loadingTokenId === item.tokenId ? 'Loading assets…' : 'Show assets of this token'}
              </button>
              <div style={{ marginTop: 8 }}>{item.image}</div>
              {assetsByToken[item.tokenId] && assetsByToken[item.tokenId].length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Active Assets ({assetsByToken[item.tokenId].length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                    {assetsByToken[item.tokenId].map((asset, i2) => {
                      const src = typeof asset === 'string' ? asset : asset.image;
                      const name = typeof asset === 'string' ? null : asset.name;
                      return (
                        <div key={(src || '') + i2}>
                          <SmartImage src={src} alt={`Asset ${i2}`} height={120} />
                          <div style={{ fontSize: 12, marginTop: 4, textAlign: 'center', color: '#333' }}>{name || `Asset ${i2 + 1}`}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {childrenByToken[item.tokenId] && childrenByToken[item.tokenId].length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Child NFTs ({childrenByToken[item.tokenId].length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                    {childrenByToken[item.tokenId].map((kid, i3) => (
                      <div key={(kid.image || '') + i3}>
                        <SmartImage src={kid.image} alt={`Child ${i3}`} height={120} />
                        <div style={{ fontSize: 12, marginTop: 4, textAlign: 'center', color: '#333' }}>{kid.name || `Child ${i3 + 1}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {assetsByToken[item.tokenId] && assetsByToken[item.tokenId].length === 0 && childrenByToken[item.tokenId] && childrenByToken[item.tokenId].length === 0 && (
                <div style={{ marginTop: 8, color: '#666' }}>No ERC-5773 assets or ERC-7401 child NFTs found for this token.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PasteUrlSwitcher({ items, onPickContract }) {
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    setMsg('');
    const found = items.find((it) => (it.image || '').startsWith(value.trim()));
    if (found?.contractAddress) {
      onPickContract(found.contractAddress);
      setMsg('Switched to contract ' + found.contractAddress);
    } else {
      setMsg('No item matched that URL in current results.');
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
      <input
        type="text"
        placeholder="Paste NFT image URL to focus its contract"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
      />
      <button type="submit">Use contract</button>
      {msg && <div style={{ marginLeft: 8, fontSize: 12, color: '#555' }}>{msg}</div>}
    </form>
  );
}

function toGatewayList(url) {
  if (!url) return [];
  const gateways = [
    'https://cloudflare-ipfs.com/ipfs/',
    'https://nftstorage.link/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/', // keep ipfs.io last due to throttling
  ];
  const ipfsMatch = url.match(/ipfs:\/\/([^\s]+)|\/ipfs\/([^\s]+)/i);
  let path = null;
  if (ipfsMatch) {
    path = (ipfsMatch[1] || ipfsMatch[2] || '').replace(/^ipfs\:\/\//, '');
  }
  if (!path) return [url];
  const list = gateways.map((g) => g + path);
  list.push(url);
  return [...new Set(list)];
}

function isLikelyVideo(u) {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(u);
}

function SmartImage({ src, alt, height = 120 }) {
  const [idx, setIdx] = useState(0);
  const [list, setList] = useState(() => toGatewayList(src));
  useEffect(() => { setList(toGatewayList(src)); setIdx(0); }, [src]);

  const onError = () => {
    setIdx((i) => Math.min(i + 1, list.length));
  };
  const current = list[idx] || src;
  if (!current) return null;

  // If we ran out of fallbacks, render a link instead of a broken image
  if (idx >= list.length) {
    return (
      <a href={src} target="_blank" rel="noreferrer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height, borderRadius: 6, border: '1px solid #ddd', background: '#f7f7f7', color: '#444', textDecoration: 'none'
      }}>
        Open asset
      </a>
    );
  }

  if (isLikelyVideo(current)) {
    return (
      <video
        src={current}
        onError={onError}
        controls
        style={{ width: '100%', height, objectFit: 'contain', borderRadius: 6, border: '1px solid #ddd', background: '#000' }}
      />
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      crossOrigin="anonymous"
      onError={onError}
      style={{ width: '100%', height, objectFit: 'contain', borderRadius: 6, border: '1px solid #ddd', background: '#fff' }}
    />
  );
}

export default App;
