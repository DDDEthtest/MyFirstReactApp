import React, { useEffect, useState } from 'react';
import { blockArtist, listArtists } from '../services/adminClient';

export default function ArtistsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      setRows(await listArtists());
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggle = (id: string, blocked: boolean) => async () => {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await blockArtist(id, !blocked);
      await refresh();
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Manage Artists</h2>
      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {error}</div>}
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              {r.name || 'Unnamed'} {r.allowlisted ? <span style={{ color: '#059669' }}>(allowlisted)</span> : null}
            </div>
            <div style={{ color: '#6b7280' }}>{r.id}</div>
          </div>
          <button className="btn" onClick={toggle(r.id, !!r.blocked)} disabled={!!busy[r.id]}>
            {!!r.blocked ? 'Unblock' : 'Block'}
          </button>
        </div>
      ))}
      {rows.length === 0 && <div>No artists found.</div>}
    </div>
  );
}

