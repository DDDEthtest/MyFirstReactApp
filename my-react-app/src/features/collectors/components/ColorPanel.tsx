import React, { useMemo, useState } from 'react';

type Props = {
  color: string; // hex like #RRGGBB
  onChange: (hex: string) => void;
  onClose?: () => void;
};

// Lightweight color utils (hex <-> hsv)
function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)); }
function hexToRgb(hex: string) {
  const m = /^#?([a-fA-F0-9]{6})$/.exec(hex || '');
  if (!m) return { r: 0, g: 0, b: 0 };
  const num = parseInt(m[1], 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const v = (1 << 24) + (clamp(r,0,255) << 16) + (clamp(g,0,255) << 8) + clamp(b,0,255);
  return '#' + v.toString(16).slice(1).toUpperCase();
}
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b); const d = max - min;
  let h = 0; const s = max === 0 ? 0 : d / max; const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
}
function hsvToRgb(h: number, s: number, v: number) {
  h = ((h % 360) + 360) % 360; s = clamp(s,0,1); v = clamp(v,0,1);
  const c = v * s; const x = c * (1 - Math.abs(((h/60) % 2) - 1)); const m = v - c;
  let r=0,g=0,b=0;
  if (0 <= h && h < 60) { r=c; g=x; b=0; }
  else if (60 <= h && h < 120) { r=x; g=c; b=0; }
  else if (120 <= h && h < 180) { r=0; g=c; b=x; }
  else if (180 <= h && h < 240) { r=0; g=x; b=c; }
  else if (240 <= h && h < 300) { r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
}

const ColorPanel: React.FC<Props> = ({ color, onChange, onClose }) => {
  const initialHsv = useMemo(() => {
    const { r,g,b } = hexToRgb(color || '#000000');
    return rgbToHsv(r,g,b);
  }, [color]);
  const [h, setH] = useState<number>(initialHsv.h);
  const [s, setS] = useState<number>(initialHsv.s);
  const [v, setV] = useState<number>(initialHsv.v);

  // compute hex from hsv
  const hex = useMemo(() => {
    const { r,g,b } = hsvToRgb(h,s,v);
    return rgbToHex(r,g,b);
  }, [h,s,v]);

  // notify parent when hex changes
  React.useEffect(() => { onChange(hex); }, [hex, onChange]);

  const onHexInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    const m = /^#?[0-9a-fA-F]{6}$/.exec(val);
    if (!m) return;
    const hexVal = val.startsWith('#') ? val : '#' + val;
    const { r,g,b } = hexToRgb(hexVal);
    const hsv = rgbToHsv(r,g,b);
    setH(hsv.h); setS(hsv.s); setV(hsv.v);
  };

  // sizes
  const hueW = 26; // wider bar for easier dragging
  const pad = 8;

  return (
    <div style={{ width: '100%' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: hex, border: '1px solid #111827' }} />
        <input
          aria-label="HEX"
          value={hex}
          onChange={onHexInput}
          style={{ flex: '1 1 auto', height: 32, borderRadius: 8, border: '1px solid #111827', background: '#0b0b0b', color: '#fff', padding: '0 10px' }}
        />
        <div style={{ flex: '0 0 auto' }}>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Saturation + vertical hue */}
      <div style={{ position: 'relative', width: '100%', height: 200, borderRadius: 10, overflow: 'hidden', background: '#111' }}>
        {/* Saturation layer */}
        <div
          onMouseDown={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const move = (ev: MouseEvent) => {
              const x = clamp((ev.clientX - rect.left) / rect.width, 0, 1);
              const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
              setS(x); setV(1 - y);
            };
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
            move(e.nativeEvent as unknown as MouseEvent);
          }}
          onTouchStart={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            const rect = el.getBoundingClientRect();
            const move = (ev: TouchEvent) => {
              const t = ev.touches[0]; if (!t) return;
              const x = clamp((t.clientX - rect.left) / rect.width, 0, 1);
              const y = clamp((t.clientY - rect.top) / rect.height, 0, 1);
              setS(x); setV(1 - y);
            };
            const up = () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
            window.addEventListener('touchmove', move, { passive: true }); window.addEventListener('touchend', up);
            const t = e.touches[0];
            if (t) {
              const x = clamp((t.clientX - rect.left) / rect.width, 0, 1);
              const y = clamp((t.clientY - rect.top) / rect.height, 0, 1);
              setS(x); setV(1 - y);
            }
          }}
          style={{ position: 'absolute', inset: 0, marginRight: hueW + pad, cursor: 'crosshair', background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(${h}, 100%, 50%))` }}
        />
        {/* Hue slider on right */}
        <div
          onMouseDown={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const move = (ev: MouseEvent) => {
              const y = clamp((ev.clientY - rect.top) / rect.height, 0, 1);
              setH((1 - y) * 360);
            };
            const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
            move(e.nativeEvent as unknown as MouseEvent);
          }}
          onTouchStart={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            const rect = el.getBoundingClientRect();
            const move = (ev: TouchEvent) => {
              const t = ev.touches[0]; if (!t) return;
              const y = clamp((t.clientY - rect.top) / rect.height, 0, 1);
              setH((1 - y) * 360);
            };
            const up = () => { window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
            window.addEventListener('touchmove', move, { passive: true }); window.addEventListener('touchend', up);
            const t = e.touches[0];
            if (t) {
              const y = clamp((t.clientY - rect.top) / rect.height, 0, 1);
              setH((1 - y) * 360);
            }
          }}
          style={{ position: 'absolute', top: 0, right: 0, width: hueW, height: '100%', borderRadius: 8, background: 'linear-gradient(to bottom, red, yellow, lime, cyan, blue, magenta, red)', marginLeft: pad, cursor: 'ns-resize' }}
        />
        {/* Hue handle */}
        <div style={{ position: 'absolute', right: hueW/2 - 12, top: (100 - (h/360)*100) + '%', width: 24, height: 10, background: '#fff', borderRadius: 4, transform: 'translateY(-50%)', boxShadow: '0 0 0 2px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
};

export default ColorPanel;
