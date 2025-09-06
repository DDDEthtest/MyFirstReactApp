import React from 'react';
import AssetImage from './AssetImage';

export default function AssetCarousel({ assets = [], onToggleAsset, activeAssetPaths, onMoveUp, onMoveDown }) {
  return (
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
        {assets.map((a, i) => {
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
                position: 'relative',
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 6, zIndex: 5 }}>
                  <button
                    type="button"
                    title="Move layer up"
                    onClick={(e) => { e.stopPropagation(); if (typeof onMoveUp === 'function') onMoveUp(a?.image); }}
                    style={{
                      border: '1px solid #bbb',
                      background: '#fff',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    title="Move layer down"
                    onClick={(e) => { e.stopPropagation(); if (typeof onMoveDown === 'function') onMoveDown(a?.image); }}
                    style={{
                      border: '1px solid #bbb',
                      background: '#fff',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: 'pointer',
                    }}
                  >
                    ▼
                  </button>
                </div>
              )}
              <AssetImage src={a?.image} alt={a?.name || `Asset ${i + 1}`} height={120} />
              <div style={{ marginTop: 6, fontSize: 12, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a?.name || `Asset ${i + 1}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
