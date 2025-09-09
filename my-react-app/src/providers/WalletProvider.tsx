import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type WalletContextValue = {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      // Basic EIP-1193 connect flow; keeps it optional to avoid throwing on non-web3 environments
      const eth = (window as any)?.ethereum;
      if (eth?.request) {
        const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
        setAddress(accounts?.[0] ?? null);
      } else {
        // Fallback: simulate connection for development if no provider present
        setAddress('0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF');
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  const value = useMemo<WalletContextValue>(() => ({
    address,
    connected: !!address,
    connecting,
    connect,
    disconnect,
  }), [address, connecting, connect, disconnect]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWalletContext = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
};

