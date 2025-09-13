import React, { useEffect, useState } from 'react';

// MashupBuilder
// Renders multiple transparent PNG layers on top of each other to form a composition.
// Props:
// - layers: Array<{ image_name: string, image_path: string, enabled: boolean }>
// - width, height: number (px)
// - style: optional extra styles for the outer container
// - background: optional CSS color for the canvas background
// Notes:
// - Each layer is drawn as an <img> occupying the full canvas, absolutely positioned.
// - Uses multi-gateway image fallback for IPFS/HTTP reliability.
export default function MashupBuilder({
  layers = [],
  // Display size defaults: width 552, height 736 (as requested)
  width = 552,
  height = 736,
  style,
  background = '#fff',
  // Keep props for compatibility (ignored for sizing now)
  aspectWidth = 760,
  aspectHeight = 1200,
  displayScale = 1,
  // Multiplier for exported PNG resolution (e.g., 2 = 2x display size)
  exportScale = 2,
}) {
  const enabledLayers = Array.isArray(layers) ? layers.filter((l) => !!l?.enabled) : [];
  const [exporting, setExporting] = useState(false);

  // Use explicit display size
  const exportWidth = width;
  const exportHeight = height;
  const canvasWidth = Math.max(1, Math.round(exportWidth * (displayScale || 1)));
  const canvasHeight = Math.max(1, Math.round(exportHeight * (displayScale || 1)));

  // Build candidate URLs for a possibly-ipfs src
  const primary = (process.env.REACT_APP_IPFS_PRIMARY_GATEWAY || '').trim();
  const gateways = [
    // Prefer Filebase first since your assets are pinned there
    'https://ipfs.filebase.io/ipfs/',
    // Optional override via env
    ...(primary ? [primary.endsWith('/') ? primary : primary + '/'] : []),
    'https://nftstorage.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/', // keep ipfs.io last due to throttling
  ];
  const makeCandidates = (u) => {
    if (!u) return [];
    const list = [];
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
  };

  const drawExact = (ctx, img, W, H) => {
    ctx.drawImage(img, 0, 0, W, H);
  };

  // Sizes: background full canvas; others proportional to base 552x736 -> 380x600
  const BASE = { W: 552, H: 736, FG_W: 380, FG_H: 600 };
  const SCALE = Math.min(exportWidth / BASE.W, exportHeight / BASE.H);
  const FG_W = Math.round(BASE.FG_W * SCALE);
  const FG_H = Math.round(BASE.FG_H * SCALE);

  const exportMashup = async () => {
    try {
      setExporting(true);
      const canvas = document.createElement('canvas');
      // Export at higher resolution using exportScale (defaults to 2x)
      canvas.width = Math.max(1, Math.round(exportWidth * (exportScale || 1)));
      canvas.height = Math.max(1, Math.round(exportHeight * (exportScale || 1)));
      const ctx = canvas.getContext('2d');
      // background
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // For each enabled layer, load image and draw it
      for (const layer of enabledLayers) {
        const candidates = makeCandidates(layer?.image_path);
        let loaded = false;
        for (const url of candidates) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const img = await loadImage(url);
            if ((layer?.image_name || '').toLowerCase() === 'background') {
              drawExact(ctx, img, canvas.width, canvas.height);
            } else {
              // Recompute FG size at export scale based on base proportions
              const expScale = Math.min(canvas.width / BASE.W, canvas.height / BASE.H);
              const w = Math.round(BASE.FG_W * expScale);
              const h = Math.round(BASE.FG_H * expScale);
              const x = Math.round((canvas.width - w) / 2);
              const y = Math.round((canvas.height - h) / 2);
              ctx.drawImage(img, x, y, w, h);
            }
            loaded = true;
            break;
          } catch (_) {
            // try next candidate
          }
        }
        if (!loaded) {
          // draw a placeholder for missing layer
          ctx.fillStyle = 'rgba(200,0,0,0.1)';
          ctx.fillRect(0, 0, exportWidth, exportHeight);
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      downloadDataUrl(dataUrl, 'mashup.png');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      width: canvasWidth,
      height: canvasHeight,
      position: 'relative',
      borderRadius: 10,
      border: '1px solid #ddd',
      background: background || '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      ...style,
    }}>
      {/* Canvas preview */}
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 10 }}>
        {/* Render background full size first */}
        {enabledLayers.filter(l => (l?.image_name || '').toLowerCase() === 'background').map((layer, i) => (
          <LayerPreview
            key={(layer?.image_name || 'layer') + ':bg:' + i}
            url={layer?.image_path}
            alt={layer?.image_name || `Layer ${i + 1}`}
            makeCandidates={makeCandidates}
            mode="background"
          />
        ))}
        {/* Render other layers centered at 380x600 */}
        {enabledLayers.filter(l => (l?.image_name || '').toLowerCase() !== 'background').map((layer, i) => (
          <LayerPreview
            key={(layer?.image_name || 'layer') + ':fg:' + i}
            url={layer?.image_path}
            alt={layer?.image_name || `Layer ${i + 1}`}
            makeCandidates={makeCandidates}
            mode="foreground"
            target={{ w: FG_W, h: FG_H }}
          />
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: -40, left: '50%', transform: 'translateX(-50%)' }}>
        <button onClick={exportMashup} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export mashup'}
        </button>
      </div>
    </div>
  );
}

function LayerPreview({ url, alt, makeCandidates, mode = 'background', target }) {
  const [idx, setIdx] = useState(0);
  const [list, setList] = useState(() => makeCandidates(url));
  useEffect(() => { setList(makeCandidates(url)); setIdx(0); }, [url]);

  const current = list[idx] || url;
  if (!current) return null;
  const onError = () => setIdx((i) => Math.min(i + 1, Math.max(0, list.length - 1)));

  // If we run out of candidates, render nothing to avoid broken icon overlay
  if (idx >= list.length) return null;

  const isBg = mode === 'background';
  const style = isBg
    ? {
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'fill', imageRendering: 'auto', mixBlendMode: 'normal'
      }
    : {
        position: 'absolute', top: '50%', left: '50%', width: (target?.w || 380) + 'px', height: (target?.h || 600) + 'px', transform: 'translate(-50%, -50%)', objectFit: 'fill', imageRendering: 'auto', mixBlendMode: 'normal'
      };

  return (
    <img src={current} alt={alt} referrerPolicy="no-referrer" onError={onError} style={style} />
  );
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename || 'download.png';
  a.click();
}
