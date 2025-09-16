import React, { useEffect, useState } from 'react';
import { approveNft, listSubmittedNfts, rejectNft } from '../services/adminClient';

export default function ApprovalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      setRows(await listSubmittedNfts());
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const act = (id: string, fn: (id: string) => Promise<void>) => async () => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await fn(id);
      await refresh();
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Approve Submitted NFTs</h2>
      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {error}</div>}
      {rows.map((r) => (
        <div
          key={r.id}
          style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f3f4f6' }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{r['artist-name'] || 'Unknown artist'}</div>
            <div style={{ color: '#6b7280' }}>{r.id}</div>
          </div>
          <button className="btn" onClick={act(r.id, approveNft)} disabled={!!busy[r.id]}>
            {busy[r.id] ? 'Working…' : 'Approve'}
          </button>
          <button className="btn secondary" onClick={act(r.id, (id) => rejectNft(id))} disabled={!!busy[r.id]}>
            Reject
          </button>
        </div>
      ))}
      {rows.length === 0 && <div>No submissions pending.</div>}
    </div>
  );
}

