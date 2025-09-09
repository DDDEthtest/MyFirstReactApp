import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import WalletConnectButton from '../../shared/components/WalletConnectButton';
import { ROUTES } from '../../shared/lib/constants';
import './artist.css';

const linkBase: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 6,
  textDecoration: 'none',
  color: '#1f2937',
  marginRight: 8,
};

const ArtistLayout: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <NavLink to={ROUTES.artists} end style={{ ...linkBase, fontWeight: 700, marginRight: 16 }}>Artist Portal</NavLink>
            <nav style={{ display: 'flex', alignItems: 'center' }}>
              <NavLink
                to={ROUTES.artistDashboard}
                style={({ isActive }) => ({
                  ...linkBase,
                  background: isActive ? '#eef2ff' : 'transparent',
                  color: isActive ? '#3730a3' : '#1f2937',
                })}
              >
                Dashboard
              </NavLink>
              <NavLink
                to={ROUTES.artistCreate}
                style={({ isActive }) => ({
                  ...linkBase,
                  background: isActive ? '#eef2ff' : 'transparent',
                  color: isActive ? '#3730a3' : '#1f2937',
                })}
              >
                Create
              </NavLink>
              <NavLink
                to={ROUTES.artistAssets}
                style={({ isActive }) => ({
                  ...linkBase,
                  background: isActive ? '#eef2ff' : 'transparent',
                  color: isActive ? '#3730a3' : '#1f2937',
                })}
              >
                Assets
              </NavLink>
            </nav>
          </div>
          <WalletConnectButton />
        </div>
      </header>
      <main style={{ flex: 1, maxWidth: 1120, margin: '0 auto', padding: '24px 16px' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default ArtistLayout;
