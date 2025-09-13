import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ArtistLayout from '../features/artists/ArtistLayout';
import { ROUTES } from '../shared/lib/constants';
import { useWallet } from '../shared/hooks/useWallet';
import { useArtistProfile } from '../features/artists/hooks/useArtistProfile';

const ArtistDashboard = lazy(() => import('../features/artists/pages/DashboardPage'));
const ArtistCreate = lazy(() => import('../features/artists/pages/CreateNftPage'));
const ArtistAssets = lazy(() => import('../features/artists/pages/AssetsPage'));

const ArtistLanding: React.FC = () => (
  <div>
    <h2 className="text-2xl font-bold">Welcome to the Artist Portal</h2>
    <p className="text-gray-600 mt-2">Connect your wallet to get started.</p>
  </div>
);

const ArtistRoute: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const { connected } = useWallet();
  const { isArtist } = useArtistProfile();
  if (!connected || !isArtist) return <Navigate to={ROUTES.artists} replace />;
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        {/* Collector routes would go here under a CollectorLayout */}

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
        <Route path="*" element={<Navigate to={ROUTES.artists} replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

