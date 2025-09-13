import React from 'react';
import { useWallet } from '../hooks/useWallet';
import { Button } from './Button';

export const WalletConnectButton: React.FC = () => {
  const { connected, connect, disconnect, address, connecting } = useWallet();

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        <Button variant="secondary" onClick={disconnect}>Disconnect</Button>
      </div>
    );
  }

  return (
    <Button onClick={connect} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect Wallet'}</Button>
  );
};

export default WalletConnectButton;

