import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../shared/lib/constants';
import { WalletProvider } from '../../providers/WalletProvider';
import { useWallet } from '../../shared/hooks/useWallet';
import './collectors.css';

const NavLink: React.FC<{ to: string; label: string }> = ({ to, label }) => {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link className={`top-tab${active ? ' is-active' : ''}`} to={to}>
      {label}
    </Link>
  );
};

const WalletBadge: React.FC = () => {
  const { connected, address, connect, disconnect } = useWallet();
  return (
    <div>
      {connected ? (
        <>
          <span style={{ marginRight: 8 }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          <button className="btn secondary" onClick={disconnect}>Disconnect</button>
        </>
      ) : (
        <button className="btn" onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
};

const CollectorLayout: React.FC = () => {
  return (
    <WalletProvider>
      <div>
        <header className="collectors-header">
          <div className="collectors-container hdr">
            <div className="hdr-left">
              <Link to={ROUTES.collectors} className="brand">Collector Portal</Link>
              <NavLink to={ROUTES.collectors} label="Explore" />
              <NavLink to={ROUTES.collectorsCollection} label="Collection" />
              <NavLink to={ROUTES.collectorsMashup} label="Mashup" />
            </div>
            <WalletBadge />
          </div>
        </header>
        <main className="collectors-container">
          <Outlet />
        </main>
      </div>
    </WalletProvider>
  );
};

export default CollectorLayout;
