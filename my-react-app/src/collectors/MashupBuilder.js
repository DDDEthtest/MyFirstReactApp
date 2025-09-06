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
  width = 420,
  height = 420,
  style,
  background = '#fff',
  aspectWidth = 760,
  aspectHeight = 1200,
  displayScale = 0.5,
}) {
  const enabledLayers = Array.isArray(layers) ? layers.filter((l) => !!l?.enabled) : [];
  const [exporting, setExporting] = useState(false);

  // Enforce fixed aspect ratio (default 1200x760) based on provided width
  const exportWidth = width;
  const exportHeight = Math.round((exportWidth * aspectHeight) / aspectWidth);
  const canvasWidth = Math.max(1, Math.round(exportWidth * (displayScale || 1)));
  const canvasHeight = Math.max(1, Math.round((canvasWidth * aspectHeight) / aspectWidth));

  // Build candidate URLs for a possibly-ipfs src
  const gateways = [
    'https://cloudflare-ipfs.com/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
  ];
  const makeCandidates = (u) => {
    if (!u) return [];
    const list = [];
    const isHttp = /^https?:\/\//i.test(u);
    const hasIpfsPath = /\/ipfs\//i.test(u);
    if (u.startsWith('ipfs://')) {
      let p = u.replace('ipfs://', '');
      if (p.startsWith('ipfs/')) p = p.slice(5);
      for (const g of gateways) list.push(g + p);
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
    // Draw scaled to exactly W x H; assets are proportional to 1200x760
    ctx.drawImage(img, 0, 0, W, H);
  };

  const exportMashup = async () => {
    try {
      setExporting(true);
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');
      // background
      if (background) {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, exportWidth, exportHeight);
      } else {
        ctx.clearRect(0, 0, exportWidth, exportHeight);
      }

      // For each enabled layer, load image and draw it
      for (const layer of enabledLayers) {
        const candidates = makeCandidates(layer?.image_path);
        let loaded = false;
        for (const url of candidates) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const img = await loadImage(url);
            drawExact(ctx, img, exportWidth, exportHeight);
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
        {/* We draw via layered previews with gateway fallbacks; export uses canvas for correctness */}
        {enabledLayers.map((layer, i) => (
          <LayerPreview
            key={(layer?.image_name || 'layer') + ':' + i}
            url={layer?.image_path}
            alt={layer?.image_name || `Layer ${i + 1}`}
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

function LayerPreview({ url, alt }) {
  const [idx, setIdx] = useState(0);
  const [list, setList] = useState(() => makeCandidates(url));
  useEffect(() => { setList(makeCandidates(url)); setIdx(0); }, [url]);

  const current = list[idx] || url;
  if (!current) return null;
  const onError = () => setIdx((i) => Math.min(i + 1, list.length));

  // If we run out of candidates, render nothing to avoid broken icon overlay
  if (idx >= list.length) return null;

  return (
    <img
      src={current}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={onError}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        imageRendering: 'auto',
        mixBlendMode: 'normal',
      }}
    />
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
