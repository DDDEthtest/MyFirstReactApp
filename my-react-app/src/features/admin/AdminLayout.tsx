import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '../../shared/lib/constants';
import WalletConnectButton from '../../shared/components/WalletConnectButton';

const linkBase: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 6,
  textDecoration: 'none',
  color: '#1f2937',
  marginRight: 8,
};

export default function AdminLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <NavLink to={ROUTES.admin} end style={{ ...linkBase, fontWeight: 700, marginRight: 16 }}>Admin</NavLink>
            <nav style={{ display: 'flex', alignItems: 'center' }}>
              <NavLink
                to={ROUTES.adminAllowlist}
                style={({ isActive }) => ({
                  ...linkBase,
                  background: isActive ? '#eef2ff' : 'transparent',
                  color: isActive ? '#3730a3' : '#1f2937',
                })}
              >
                Allowlist
              </NavLink>
              <NavLink
                to={ROUTES.adminApprovals}
                style={({ isActive }) => ({
                  ...linkBase,
                  background: isActive ? '#eef2ff' : 'transparent',
                  color: isActive ? '#3730a3' : '#1f2937',
                })}
              >
                Approvals
              </NavLink>
              <NavLink
                to={ROUTES.adminArtists}
                style={({ isActive }) => ({
                  ...linkBase,
                  background: isActive ? '#eef2ff' : 'transparent',
                  color: isActive ? '#3730a3' : '#1f2937',
                })}
              >
                Artists
              </NavLink>
              <NavLink
                to={ROUTES.adminMinting}
                style={({ isActive }) => ({
                  ...linkBase,
                  background: isActive ? '#eef2ff' : 'transparent',
                  color: isActive ? '#3730a3' : '#1f2937',
                })}
              >
                Minting
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
}

