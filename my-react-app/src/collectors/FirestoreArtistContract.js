import React, { useEffect, useMemo, useState } from 'react';
// Requires: npm i firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Component: connects to Firestore and checks if an artist exists
// in the `artists` collection with the given wallet address. If found,
// renders "<wallet> yes".
//
// Props:
// - walletAddress?: string (required for query)
// - firebaseConfig?: object (if not provided, attempts to read from window.__FIREBASE_CONFIG__
//   or REACT_APP_FIREBASE_* environment variables)


function resolveFirebaseConfig(explicit) {
  if (explicit && typeof explicit === 'object') return explicit;
  // Prefer a global injected config if present
  if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;
  // Try environment variables (Create React App style)
  const cfg = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
  // If required fields are missing, return null so the component can render a hint instead of crashing
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) return null;
  return cfg;
}

export default function FirestoreArtistContract({ walletAddress, firebaseConfig }) {
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(false);
  const [error, setError] = useState('');

  const config = useMemo(() => resolveFirebaseConfig(firebaseConfig), [firebaseConfig]);
  const ACTIVE_WALLET = useMemo(() => (walletAddress ? String(walletAddress).toLowerCase() : ''), [walletAddress]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!config || !ACTIVE_WALLET) {
        // No config available; do not attempt to initialize Firebase
        return;
      }
      try {
        setLoading(true);
        setError('');
        // Initialize (idempotent)
        const app = getApps().length ? getApp() : initializeApp(config);
        const db = getFirestore(app);
        // Query artists by exact wallet match (normalize to lowercase)
        const q = query(collection(db, 'artists'), where('wallet', '==', ACTIVE_WALLET));
        const snap = await getDocs(q);
        if (!cancelled) setFound(!snap.empty);
      } catch (e) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ACTIVE_WALLET, config]);

  if (!config) {
    return (
      <div style={{ color: '#555' }}>
        Missing Firebase config. Provide via prop `firebaseConfig`, window.__FIREBASE_CONFIG__, or REACT_APP_FIREBASE_* env vars.
      </div>
    );
  }

  if (!ACTIVE_WALLET) {
    return <div style={{ color: '#555' }}>Connect a wallet to check if the artist exists.</div>;
  }

  if (loading) return <div>Checking artist…</div>;
  if (error) return <div style={{ color: 'crimson' }}>Error: {error}</div>;

  return (
    <div>
      {found ? (
        <span style={{ fontFamily: 'monospace' }}>{ACTIVE_WALLET} yes</span>
      ) : (
        <span style={{ color: '#888' }}>No matching artist found.</span>
      )}
    </div>
  );
}

