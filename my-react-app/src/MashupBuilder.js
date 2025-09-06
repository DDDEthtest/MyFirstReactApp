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

      // Draw layers in order (earlier first, later on top)
      for (const layer of enabledLayers) {
        const candidates = makeCandidates(layer?.image_path);
        let img = null;
        for (const url of candidates) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const loaded = await new Promise((resolve, reject) => {
              const im = new Image();
              im.crossOrigin = 'anonymous';
              im.onload = () => resolve(im);
              im.onerror = reject;
              im.src = url;
            });
            img = loaded; break;
          } catch (_) {
            // try next candidate
          }
        }
        if (img) {
          drawExact(ctx, img, exportWidth, exportHeight);
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'mashup.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert('Could not export image. Some layers may block cross-origin drawing.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: canvasWidth,
          height: canvasHeight,
          border: '1px solid #ddd',
          borderRadius: 8,
          overflow: 'hidden',
          background,
          ...style,
        }}
      >
        {enabledLayers.map((layer, i) => (
          <LayerImage
            key={(layer?.image_name || 'layer') + ':' + i}
            src={layer?.image_path}
            alt={layer?.image_name || `Layer ${i + 1}`}
            zIndex={i + 1}
            width={canvasWidth}
            height={canvasHeight}
          />
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <button
          type="button"
          onClick={exportMashup}
          disabled={exporting || enabledLayers.length === 0}
          style={{
            padding: '6px 12px',
            border: '1px solid #bbb',
            background: exporting ? '#eee' : '#fff',
            borderRadius: 6,
            cursor: exporting || enabledLayers.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {exporting ? 'Exporting…' : 'Export mashup'}
        </button>
      </div>
    </div>
  );
}

function LayerImage({ src, alt, zIndex, width, height }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'done' | 'error'
  const [index, setIndex] = useState(0);

  // Popular gateways; ordered by likelihood/latency
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
      // Normalize double /ipfs/ipfs/
      const after = u.split(/\/ipfs\//i)[1];
      if (after) {
        for (const g of gateways) list.push(g + after.replace(/^ipfs\//i, ''));
      }
    }

    // Fallback: try the original URL and HTTPS-upgrade variant
    list.push(u);
    if (/^http:\/\//i.test(u)) list.push(u.replace(/^http:\/\//i, 'https://'));
    return Array.from(new Set(list));
  };

  const candidates = makeCandidates(src);
  const current = candidates[index];

  useEffect(() => {
    setStatus('loading');
    setIndex(0);
  }, [src]);

  const handleError = () => {
    if (index + 1 < candidates.length) {
      setIndex(index + 1);
      setStatus('loading');
    } else {
      setStatus('error');
    }
  };

  return (
    <>
      {current && (
        <img
          src={current}
          alt={alt}
          onLoad={() => setStatus('done')}
          onError={handleError}
          style={{
            position: 'absolute',
            inset: 0,
            width: width || '100%',
            height: height || '100%',
            objectFit: 'fill',
            zIndex,
            display: status === 'done' ? 'block' : 'none',
          }}
        />
      )}
      {status === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: 12,
            zIndex,
          }}
        >
          Loading...
        </div>
      )}
      {status === 'error' && (
        <div
          title={current || src}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a33',
            fontSize: 12,
            zIndex,
          }}
        >
          Could not load image
        </div>
      )}
    </>
  );
}
