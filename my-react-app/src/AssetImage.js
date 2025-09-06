import React, { useEffect, useState } from 'react';

export default function AssetImage({ src, alt, height = 320, style }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'done' | 'error'
  const [index, setIndex] = useState(0);

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
    <div style={{ width: '100%', height, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #ddd', borderRadius: 6, ...style }}>
      {status === 'loading' && (
        <div style={{ color: '#666', fontSize: 13 }}>Loading...</div>
      )}
      {status === 'error' && (
        <div style={{ color: '#a33', fontSize: 12 }}>Could not load image</div>
      )}
      {current && (
        <img
          src={current}
          alt={alt}
          onLoad={() => setStatus('done')}
          onError={handleError}
          style={{ width: '100%', height, objectFit: 'contain', display: status === 'done' ? 'block' : 'none' }}
        />
      )}
    </div>
  );
}

