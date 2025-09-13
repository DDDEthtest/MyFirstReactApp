import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import WalletConnectButton from '../../shared/components/WalletConnectButton';
import { ROUTES } from '../../shared/lib/constants';

const ArtistLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to={ROUTES.artists} className="font-bold">Artist Portal</Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link to={ROUTES.artistDashboard}>Dashboard</Link>
              <Link to={ROUTES.artistCreate}>Create</Link>
              <Link to={ROUTES.artistAssets}>Assets</Link>
            </nav>
          </div>
          <WalletConnectButton />
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default ArtistLayout;

