import React, { useEffect, useRef, useState } from 'react';
import NFTLoader, { DEFAULT_CONTRACT } from './NFTLoader';
import AssetImage from './AssetImage';

// A simple gallery that loads NFTs via NFTLoader and renders them
// using only the class getter methods.
function NFTGallery({ contract = DEFAULT_CONTRACT, onToggleAsset, activeAssetPaths, showCarousel = true, onAssetsChange }) {
  const loaderRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const [selectedTokenId, setSelectedTokenId] = useState('');
  const [, forceRerender] = useState(0); // to rerender after loaderRef is updated

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        loaderRef.current = new NFTLoader({ contract });
        await loaderRef.current.loadAll({ maxCount: 300 });
        if (!cancelled) {
          const tokens = loaderRef.current.getTokens();
          setCount(tokens.length);
          // Default selection: the last loaded NFT
          const last = tokens[tokens.length - 1];
          setSelectedTokenId(last ? last.tokenId : '');
          forceRerender((x) => x + 1);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contract]);

  // Notify parent about currently selected token's assets once data is ready
  useEffect(() => {
    if (typeof onAssetsChange !== 'function') return;
    if (loading || error) return;
    const loader = loaderRef.current;
    if (!loader) return;
    try {
      const tokens = loader.getTokens();
      const sel = selectedTokenId ? loader.getByTokenId(selectedTokenId) : (tokens[tokens.length - 1] || null);
      onAssetsChange(sel?.assets || []);
    } catch (_) {
      // ignore until loader is fully ready
    }
  }, [loading, error, selectedTokenId, onAssetsChange]);

  if (loading) return <div style={{ padding: 16 }}>Loading NFTs…</div>;
  if (error) return <div style={{ padding: 16, color: 'crimson' }}>Error: {error}</div>;

  const loader = loaderRef.current;
  const tokens = loader?.getTokens() || [];

  // Determine the selected token and its first asset image
  const selected = selectedTokenId ? loader.getByTokenId(selectedTokenId) : (tokens[tokens.length - 1] || null);
  const selectedLinks = selected ? loader.getImageLinks(selected.tokenId) : [];
  const firstAsset = selectedLinks && selectedLinks.length > 0 ? selectedLinks[0] : (selected?.previewImage || null);

  // Exposed via effect above

  const onPick = (e) => {
    setSelectedTokenId(e.target.value);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>NFT Selector ({count})</h2>

      {tokens.length === 0 ? (
        <div>No items found.</div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="nftSelect" style={{ marginRight: 8 }}>Choose NFT:</label>
            <select id="nftSelect" value={selected?.tokenId || ''} onChange={onPick}>
              {tokens.map((t, i) => (
                <option key={(t.tokenId || i) + ':' + i} value={t.tokenId}>
                  {t.title || t.tokenId}
                </option>
              ))}
            </select>
          </div>

          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fafafa', maxWidth: 420 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selected?.title || 'Untitled NFT'}</div>
            {firstAsset ? (
              <AssetImage src={firstAsset} alt="First asset" height={320} />
            ) : (
              <div style={{ width: '100%', height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', background: '#fff', border: '1px solid #ddd', borderRadius: 6 }}>No asset image</div>
            )}
          </div>

          {/* Horizontal carousel with all assets for the selected NFT */}
          {showCarousel && selected?.assets && selected.assets.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Assets</div>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 8,
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {selected.assets.map((a, i) => {
                  const isActive = activeAssetPaths instanceof Set && a?.image ? activeAssetPaths.has(a.image) : false;
                  const borderColor = isActive ? '#2ecc71' : '#eee';
                  return (
                    <div
                      key={(a?.name || 'asset') + ':' + i}
                      onClick={() => {
                        if (typeof onToggleAsset === 'function') {
                          onToggleAsset({ image_name: a?.name || `Asset ${i + 1}`, image_path: a?.image });
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {
                        if (typeof onToggleAsset === 'function') onToggleAsset({ image_name: a?.name || `Asset ${i + 1}`, image_path: a?.image });
                      }}}
                      style={{
                        flex: '0 0 auto',
                        width: 160,
                        border: `2px solid ${borderColor}`,
                        borderRadius: 8,
                        padding: 8,
                        background: '#fff',
                        textAlign: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <AssetImage src={a?.image} alt={a?.name || `Asset ${i + 1}`} height={120} />
                      <div style={{ marginTop: 6, fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a?.name || `Asset ${i + 1}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default NFTGallery;

