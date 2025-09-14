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
      // Prefer a real EIP-1193 provider; never fall back to a dummy address.
      const eth = (window as any)?.ethereum as any;

      // Some environments expose multiple providers (e.g., MetaMask + Coinbase)
      const pickProvider = () => {
        if (!eth) return null;
        const list: any[] = Array.isArray(eth?.providers) ? eth.providers : [eth];
        // Prefer MetaMask, then Coinbase Wallet, then the first provider
        return (
          list.find((p: any) => p?.isMetaMask) ||
          list.find((p: any) => p?.isCoinbaseWallet) ||
          list.find((p: any) => typeof p?.request === 'function') ||
          null
        );
      };

      const provider = pickProvider();
      if (provider?.request) {
        const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
        setAddress(accounts?.[0] ?? null);
        return;
      }

      // No injected provider: suggest opening in a mobile wallet browser
      const href = window.location.href.replace(/^https?:\/\//, '');
      const deepLink = `https://metamask.app.link/dapp/${href}`;
      // Try a gentle redirect on mobile so users land inside MetaMask in-app browser
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = deepLink;
      } else {
        alert('No Ethereum provider detected. Please install MetaMask or open this site in your wallet app.');
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
