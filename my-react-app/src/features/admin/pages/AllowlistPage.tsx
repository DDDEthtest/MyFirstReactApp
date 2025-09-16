import React, { useEffect, useState } from 'react';
import { allowlistArtist, listArtists } from '../services/adminClient';
import { grantAssetManagerRole } from '../services/collectionAdmin';

export default function AllowlistPage() {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string | null; alreadyGranted: boolean } | null>(null);
  const explorer = (process.env.REACT_APP_BLOCK_EXPLORER || 'https://polygonscan.com').replace(/\/$/, '');

  const refresh = async () => {
    setError(null);
    try {
      const all = await listArtists();
      setList(all.filter((a) => a.allowlisted));
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;
    setLoading(true);
    setError(null);
    try {
      // 1) Grant ASSET_MANAGER_ROLE on-chain
      const res = await grantAssetManagerRole(wallet);
      setResult(res);
      // 2) If success (or already granted), add to Firestore artists collection
      await allowlistArtist({ wallet, name });
      setWallet('');
      setName('');
      await refresh();
    } catch (e: any) {
      const msg = e?.shortMessage || e?.info?.error?.message || e?.message || String(e);
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Allowlist Artists</h2>
      <form onSubmit={onAdd} style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        <input
          placeholder="Wallet address"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, flex: 1 }}
        />
        <input
          placeholder="Display name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <button className="btn" disabled={loading}>
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>
      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {error}</div>}
      {result && (
        <div style={{ marginBottom: 12 }}>
          {result.alreadyGranted ? (
            <span style={{ color: '#065f46' }}>Role already granted for this wallet.</span>
          ) : result.txHash ? (
            <span>
              <span style={{ color: '#065f46' }}>Role granted.</span>{' '}
              <a href={`${explorer}/tx/${result.txHash}`} target="_blank" rel="noreferrer" style={{ color: '#4f46e5' }}>
                View transaction
              </a>
            </span>
          ) : (
            <span style={{ color: '#065f46' }}>Role granted.</span>
          )}
        </div>
      )}
      <div>
        {list.map((a) => (
          <div key={a.id} style={{ padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ fontWeight: 600 }}>{a.name || 'Unnamed'}</div>
            <div style={{ color: '#6b7280' }}>{a.id}</div>
          </div>
        ))}
        {list.length === 0 && <div>No allowlisted artists yet.</div>}
      </div>
    </div>
  );
}
