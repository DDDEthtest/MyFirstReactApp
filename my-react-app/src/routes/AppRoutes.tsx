import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ArtistLayout from '../features/artists/ArtistLayout';
import CollectorLayout from '../features/collectors/CollectorLayout';
import { ROUTES } from '../shared/lib/constants';
import { useWallet } from '../shared/hooks/useWallet';
import { useArtistProfile } from '../features/artists/hooks/useArtistProfile';

const ArtistDashboard = lazy(() => import('../features/artists/pages/DashboardPage'));
const ArtistCreate = lazy(() => import('../features/artists/pages/CreateNftPage'));
const ArtistAssets = lazy(() => import('../features/artists/pages/AssetsPage'));
const CollectorsExplore = lazy(() => import('../features/collectors/pages/ExplorePage'));
const CollectorsCollection = lazy(() => import('../features/collectors/pages/CollectionPage'));

const ArtistLanding: React.FC = () => {
  const { connected, address } = useWallet();
  const { isArtist, loading, profile } = useArtistProfile();
  return (
    <div>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Welcome to the Artist Portal</h2>
      <div style={{ margin: '12px 0', color: '#374151' }}>
        <div style={{ marginBottom: 6 }}>
          Connected: {connected ? 'yes' : 'no'}{connected && address ? ` — ${address.slice(0, 6)}...${address.slice(-4)}` : ''}
        </div>
        <div>Artist access: {loading ? 'checking…' : (isArtist ? 'yes' : 'no')}</div>
        {isArtist && (
          <div style={{ marginTop: 6 }}>Artist: {profile.displayName}</div>
        )}
      </div>
      {isArtist ? (
        <a href={ROUTES.artistDashboard} style={{ display: 'inline-block', padding: '8px 12px', background: '#4f46e5', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>
          Go to Dashboard
        </a>
      ) : (
        <p style={{ color: '#6b7280' }}>Connect your wallet to get started.</p>
      )}
    </div>
  );
};

const ArtistRoute: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { connected } = useWallet();
  const { isArtist, loading } = useArtistProfile();
  if (!connected) return <Navigate to={ROUTES.artists} replace />;
  if (loading) return <div>Checking permissions…</div>;
  if (!isArtist) {
    return <div style={{ padding: 16, color: '#b91c1c' }}>Access denied for this wallet or unable to verify artist status. Check Firebase env vars and Firestore allowlist.</div>;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* Collectors */}
        <Route path={ROUTES.collectors} element={<CollectorLayout />}>
          <Route index element={<CollectorsExplore />} />
          <Route path={ROUTES.collectorsCollection.replace(`${ROUTES.collectors}/`, '')} element={<CollectorsCollection />} />
        </Route>
        {/* Home redirects to collectors */}
        <Route path={ROUTES.home} element={<Navigate to={ROUTES.collectors} replace />} />

        {/* Artist routes */}
        <Route path={ROUTES.artists} element={<ArtistLayout />}>
          <Route index element={<ArtistLanding />} />
          <Route
            path={ROUTES.artistDashboard.replace(`${ROUTES.artists}/`, '')}
            element={(<ArtistRoute><ArtistDashboard /></ArtistRoute>)}
          />
          <Route
            path={ROUTES.artistCreate.replace(`${ROUTES.artists}/`, '')}
            element={(<ArtistRoute><ArtistCreate /></ArtistRoute>)}
          />
          <Route
            path={ROUTES.artistAssets.replace(`${ROUTES.artists}/`, '')}
            element={(<ArtistRoute><ArtistAssets /></ArtistRoute>)}
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.collectors} replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
