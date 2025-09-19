import React, { useEffect, useState, useCallback, useMemo } from 'react';

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
  // Optional per-layer color overrides (for SVG layers)
  colorMap = {}, // e.g., { bottom: '#00ff00', upper: '#00ff00', face: '#00ff00', eyes: '#ffff00', hair: '#0000ff' }
}) {
  const enabledLayers = Array.isArray(layers) ? layers.filter((l) => !!l?.enabled) : [];
  const ORDER = ['background','bottom','upper','head','eyes','hat','hair','left_accessory','right_accessory'];
  const idx = (n) => {
    const i = ORDER.indexOf(String(n || '').toLowerCase());
    return i === -1 ? 999 : i;
  };
  const [exporting, setExporting] = useState(false);
  const [loadingCount, setLoadingCount] = useState(0);
  const startLoading = useCallback(() => setLoadingCount((n) => n + 1), []);
  const finishLoading = useCallback(() => setLoadingCount((n) => Math.max(0, n - 1)), []);

  // Use explicit display size
  const exportWidth = width;
  const exportHeight = height;
  const canvasWidth = Math.max(1, Math.round(exportWidth * (displayScale || 1)));
  const canvasHeight = Math.max(1, Math.round(exportHeight * (displayScale || 1)));

  // Build candidate URLs for a possibly-ipfs src
  const primary = (process.env.REACT_APP_IPFS_PRIMARY_GATEWAY || '').trim();
  const gateways = useMemo(() => ([
    // Prefer Filebase first since your assets are pinned there
    'https://ipfs.filebase.io/ipfs/',
    // Optional override via env
    ...(primary ? [primary.endsWith('/') ? primary : primary + '/'] : []),
    'https://nftstorage.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/', // keep ipfs.io last due to throttling
  ]), [primary]);
  const makeCandidates = useCallback((u) => {
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
  }, [gateways]);

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
      background: background || '#E5E4E2',
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
            tint={colorMap[String(layer?.image_name || '').toLowerCase()]}
            startLoading={startLoading}
            finishLoading={finishLoading}
          />
        ))}
        {/* Render other layers centered at 380x600 in a stable order */}
        {enabledLayers
          .filter(l => (l?.image_name || '').toLowerCase() !== 'background')
          .slice()
          .sort((a,b) => idx(a?.image_name) - idx(b?.image_name))
          .map((layer, i) => (
          <LayerPreview
            key={(layer?.image_name || 'layer') + ':fg:' + i}
            url={layer?.image_path}
            alt={layer?.image_name || `Layer ${i + 1}`}
            makeCandidates={makeCandidates}
            mode="foreground"
            target={{ w: FG_W, h: FG_H }}
            tint={colorMap[String(layer?.image_name || '').toLowerCase()]}
            startLoading={startLoading}
            finishLoading={finishLoading}
          />
        ))}
      </div>

      {loadingCount > 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: 10, fontWeight: 600, color: '#374151' }}>
          Loading...
        </div>
      )}

      {/* Floating export button (top-right, square) */}
      <button
        className="export-btn-square"
        onClick={exportMashup}
        disabled={exporting}
        title="Export mashup"
        aria-label="Export mashup"
        style={{ position: 'absolute', top: 8, right: 8 }}
      >
        {exporting ? '…' : '⤓'}
      </button>
    </div>
  );
}

function LayerPreview({ url, alt, makeCandidates, mode = 'background', target, tint, startLoading, finishLoading }) {
  const [idx, setIdx] = useState(0);
  const [list, setList] = useState(() => makeCandidates(url));
  useEffect(() => { setList(makeCandidates(url)); setIdx(0); }, [url, makeCandidates]);

  // track loading lifecycle
  const reportedRef = React.useRef(false);
  useEffect(() => {
    reportedRef.current = false;
    if (typeof startLoading === 'function') startLoading();
    // finishLoading will be called after successful load or fallback
    // Ensure we don't leave overlay on error with no candidates
    return () => {
      if (!reportedRef.current && typeof finishLoading === 'function') finishLoading();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

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

  // If a tint is requested, attempt SVG inline rendering even if the URL lacks an .svg extension.
  if (tint) {
    return (
      <InlineSvg url={current} alt={alt} style={style} onError={onError} makeCandidates={makeCandidates} color={tint} onReady={() => { if (!reportedRef.current && typeof finishLoading==='function') { reportedRef.current=true; finishLoading(); } }} />
    );
  }
  const onLoad = () => { if (!reportedRef.current && typeof finishLoading==='function') { reportedRef.current=true; finishLoading(); } };
  const onErr = () => { if (!reportedRef.current && typeof finishLoading==='function') { reportedRef.current=true; finishLoading(); } onError?.(); };
  return <img src={current} alt={alt} referrerPolicy="no-referrer" onError={onErr} onLoad={onLoad} style={style} />;
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

// Inline SVG renderer with color override
function InlineSvg({ url, alt, style, onError, makeCandidates, color, onReady }) {
  const [svgText, setSvgText] = useState(null);
  // Show the original image while we try to fetch + inline the SVG
  const [fallbackImg, setFallbackImg] = useState(url);
  const [idx, setIdx] = useState(0);
  const [list, setList] = useState(() => makeCandidates(url));
  useEffect(() => { setList(makeCandidates(url)); setIdx(0); setSvgText(null); setFallbackImg(url); }, [url, makeCandidates]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      for (let i = idx; i < list.length; i++) {
        try {
          const res = await fetch(list[i], { credentials: 'omit', mode: 'cors' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          const txt = await res.text();
          const looksSvg = ct.includes('image/svg') || /<svg[\s\S]*<\/svg>/i.test(txt);
          if (!cancelled) {
            if (looksSvg) {
              setSvgText(applyColorToSvgScoped(txt, color));
              setFallbackImg(null);
              onReady?.();
            } else {
              setFallbackImg(list[i]);
              onReady?.();
            }
          }
          return;
        } catch (e) {
          // try next
          if (i === list.length - 1) {
            if (typeof onError === 'function') onError(e);
            onReady?.();
          }
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [list, idx, color, onError]);

  if (svgText) {
    // eslint-disable-next-line react/no-danger
    return <div role="img" aria-label={alt} style={style} dangerouslySetInnerHTML={{ __html: svgText }} />;
  }
  if (fallbackImg) {
    return <img src={fallbackImg} alt={alt} referrerPolicy="no-referrer" style={style} onError={onError} />;
  }
  return null;
}

// Safer scoping: prevent color bleed between multiple inline SVGs
function applyColorToSvgScoped(svgString, color) {
  try {
    const uid = 'tint-' + Math.random().toString(36).slice(2);
    const styleTag = `<style>.${uid} *{fill: ${color} !important;}</style>`;
    if (/<svg[^>]*>/i.test(svgString)) {
      return svgString
        .replace(/<svg([^>]*)>/i, (m, attrs) => {
          let a = attrs || '';
          a = a.replace(/\swidth=\"[^\"]*\"/ig, '');
          a = a.replace(/\sheight=\"[^\"]*\"/ig, '');
          if (/\sclass=\"[^\"]*\"/i.test(a)) {
            a = a.replace(/\sclass=\"([^\"]*)\"/i, (mm, classes) => ` class=\"${classes} ${uid}\"`);
          } else {
            a += ` class=\"${uid}\"`;
          }
          return `<svg${a} width=\"100%\" height=\"100%\" preserveAspectRatio=\"none\">${styleTag}`;
        });
    }
    return styleTag + svgString;
  } catch (_) {
    return svgString;
  }
}

function applyColorToSvg(svgString, color) {
  try {
    // Inject a style block forcing fill to the requested color (keep strokes/outline as-is)
    const hasStyle = /<style[\s\S]*?>[\s\S]*?<\/style>/i.test(svgString);
    const styleTag = `<style>*{fill: ${color} !important;} svg{width:100%;height:100%;}</style>`;
    if (/<svg[^>]*>/i.test(svgString)) {
      return svgString
        .replace(/<svg([^>]*)>/i, (m, attrs) => {
          let a = attrs || '';
          // Ensure width/height 100%
          a = a.replace(/\swidth="[^"]*"/i, '');
          a = a.replace(/\sheight="[^"]*"/i, '');
          if (!/viewBox=/i.test(a)) {
            // leave as-is if no viewBox; scaling may distort but better visible
          }
          return `<svg${a} width="100%" height="100%" preserveAspectRatio="none">${styleTag}`;
        });
    }
    // Fallback: prepend style
    return styleTag + svgString;
  } catch (_) {
    return svgString;
  }
}

