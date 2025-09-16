import React, { useEffect, useState } from 'react';
import { listListedNfts, setListingPaused } from '../services/adminClient';

export default function MintingPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      setRows(await listListedNfts());
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggle = (id: string, paused: boolean) => async () => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await setListingPaused(id, !paused);
      await refresh();
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Minting Controls</h2>
      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {error}</div>}
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              {r['artist-name'] || 'Unknown artist'} {r.paused ? <span style={{ color: '#b91c1c' }}>(paused)</span> : <span style={{ color: '#059669' }}>(active)</span>}
            </div>
            <div style={{ color: '#6b7280' }}>Listing #{r.listingId} • {r.id}</div>
          </div>
          <button className="btn" onClick={toggle(r.id, !!r.paused)} disabled={!!busy[r.id]}>
            {r.paused ? 'Unpause' : 'Pause'}
          </button>
        </div>
      ))}
      {rows.length === 0 && <div>No listed items found.</div>}
    </div>
  );
}

