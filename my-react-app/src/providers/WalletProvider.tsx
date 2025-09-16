import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

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
  const providerRef = useRef<any>(null);

  // Polygon mainnet details
  const POLYGON = useMemo(() => ({
    chainIdHex: '0x89', // 137
    params: {
      chainId: '0x89',
      chainName: 'Polygon Mainnet',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      rpcUrls: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
      blockExplorerUrls: ['https://polygonscan.com']
    }
  }), []);

  const ensurePolygon = useCallback(async (prov: any) => {
    if (!prov?.request) return;
    try {
      // First attempt to switch
      await prov.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: POLYGON.chainIdHex }] });
    } catch (err: any) {
      // 4902 = chain not added
      if (err?.code === 4902 || /Unrecognized chain ID/i.test(err?.message || '')) {
        await prov.request({ method: 'wallet_addEthereumChain', params: [POLYGON.params] });
      } else {
        // Surface a gentle message but don't block address display
        console.warn('Network switch to Polygon failed:', err);
      }
    }
  }, [POLYGON]);

  const connect = useCallback(async () => {
    try {
      setConnecting(true);
      // Prefer a real EIP-1193 provider; never fall back to a dummy address.
      const detectProvider = async (): Promise<any | null> => {
        const maxWaitMs = 800;
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
          const eth = (window as any)?.ethereum as any;
          if (eth) {
            const list: any[] = Array.isArray(eth?.providers) ? eth.providers : [eth];
            const p = (
              list.find((x: any) => x?.isMetaMask) ||
              list.find((x: any) => x?.isCoinbaseWallet) ||
              list.find((x: any) => typeof x?.request === 'function') ||
              null
            );
            if (p) return p;
          }
          await new Promise((r) => setTimeout(r, 50));
        }
        return null;
      };

      const provider = await detectProvider();
      if (provider?.request) {
        const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
        providerRef.current = provider;
        // Ensure Polygon chain
        await ensurePolygon(provider);
        setAddress(accounts?.[0] ?? null);
        try { localStorage.setItem('wallet:auto', '1'); } catch {}
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
        // Provide a clear message without blocking if popup blockers interfere
        window.alert('No Ethereum provider detected. Please install MetaMask or open this site in your wallet app.');
      }
    } finally {
      setConnecting(false);
    }
  }, []);
  
  // Auto reconnect and listen to provider events
  useEffect(() => {
    const eth = (window as any)?.ethereum as any;
    const list: any[] = Array.isArray(eth?.providers) ? eth.providers : (eth ? [eth] : []);
    const provider = list.find((p: any) => p?.isMetaMask) || list.find((p: any) => p?.isCoinbaseWallet) || list.find((p: any) => typeof p?.request === 'function');
    const shouldAuto = (() => { try { return localStorage.getItem('wallet:auto') === '1'; } catch { return false; } })();
    if (provider && shouldAuto) {
      (async () => {
        try {
          const accounts: string[] = await provider.request({ method: 'eth_accounts' });
          if (accounts && accounts[0]) {
            providerRef.current = provider;
            await ensurePolygon(provider);
            setAddress(accounts[0]);
          }
        } catch (e) {
          console.warn('Auto connect failed:', e);
        }
      })();
    }

    const onAccounts = (accs: string[]) => {
      setAddress(accs?.[0] ?? null);
    };
    const onChain = async (_: any) => {
      if (providerRef.current) await ensurePolygon(providerRef.current);
    };
    if (provider?.on) {
      provider.on('accountsChanged', onAccounts);
      provider.on('chainChanged', onChain);
      return () => {
        provider.removeListener?.('accountsChanged', onAccounts);
        provider.removeListener?.('chainChanged', onChain);
      };
    }
  }, [ensurePolygon]);

  const disconnect = useCallback(() => {
    setAddress(null);
    try { localStorage.removeItem('wallet:auto'); } catch {}
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
