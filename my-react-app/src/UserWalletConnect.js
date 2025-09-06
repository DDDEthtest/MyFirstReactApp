import React, { useEffect, useMemo, useState } from 'react';

// Lightweight wallet connector using EIP-1193 (e.g., MetaMask)
// - Connects to user's wallet
// - Ensures Polygon Mainnet (chainId 0x89)
// - Emits connection details via onConnected callback

const POLYGON = {
  chainId: '0x89', // 137
  chainName: 'Polygon Mainnet',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: [
    'https://polygon-rpc.com',
    'https://polygon.llamarpc.com',
    'https://rpc.ankr.com/polygon',
  ],
  blockExplorerUrls: ['https://polygonscan.com'],
};

function short(addr) {
  if (!addr) return '';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export default function UserWalletConnect({ desiredChainId = POLYGON.chainId, onConnected }) {
  const [address, setAddress] = useState('');
  const [chainId, setChainId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const hasProvider = typeof window !== 'undefined' && !!window.ethereum;

  const toChainIdString = (cid) => {
    if (cid == null) return '';
    const s = String(cid).trim();
    if (/^0x/i.test(s)) return s.toLowerCase();
    const n = Number(s);
    if (Number.isFinite(n)) return '0x' + n.toString(16);
    return s.toLowerCase();
  };

  const isCorrectNetwork = useMemo(() => {
    return toChainIdString(chainId) === toChainIdString(desiredChainId);
  }, [chainId, desiredChainId]);

  useEffect(() => {
    if (!hasProvider) return;
    const eth = window.ethereum;
    const handleAccounts = (accounts) => {
      const acc = Array.isArray(accounts) && accounts.length ? accounts[0] : '';
      setAddress(acc);
      if (onConnected && acc) onConnected({ address: acc, chainId, isCorrectNetwork, provider: eth });
    };
    const handleChain = (cid) => {
      setChainId(cid);
      const ok = toChainIdString(cid) === toChainIdString(desiredChainId);
      if (onConnected && address) onConnected({ address, chainId: cid, isCorrectNetwork: ok, provider: eth });
    };
    eth.request({ method: 'eth_accounts' }).then(handleAccounts).catch(() => {});
    eth.request({ method: 'eth_chainId' }).then(handleChain).catch(() => {});
    eth.on?.('accountsChanged', handleAccounts);
    eth.on?.('chainChanged', handleChain);
    return () => {
      eth.removeListener?.('accountsChanged', handleAccounts);
      eth.removeListener?.('chainChanged', handleChain);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProvider]);

  const switchToDesired = async () => {
    if (!hasProvider) return;
    const eth = window.ethereum;
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: desiredChainId }] });
    } catch (e) {
      if (e?.code === 4902) {
        // Chain not added; try to add Polygon then switch
        await eth.request({ method: 'wallet_addEthereumChain', params: [{ ...POLYGON }] });
        await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: desiredChainId }] });
      } else {
        throw e;
      }
    }
  };

  const connect = async () => {
    if (!hasProvider) {
      setError('No injected wallet found. Install MetaMask or a compatible wallet.');
      return;
    }
    const eth = window.ethereum;
    setError('');
    setConnecting(true);
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const acc = accounts?.[0] || '';
      setAddress(acc);
      const cid = await eth.request({ method: 'eth_chainId' });
      setChainId(cid);
      if (toChainIdString(cid) !== toChainIdString(desiredChainId)) {
        await switchToDesired();
      }
      const finalCid = await eth.request({ method: 'eth_chainId' });
      setChainId(finalCid);
      const ok = toChainIdString(finalCid) === toChainIdString(desiredChainId);
      if (onConnected && acc) onConnected({ address: acc, chainId: finalCid, isCorrectNetwork: ok, provider: eth });
    } catch (e) {
      // Common error codes: 4001 user rejected, 4902 unknown chain
      setError(e?.message || String(e));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {!hasProvider && (
        <a href="https://metamask.io" target="_blank" rel="noreferrer">Install MetaMask</a>
      )}
      {hasProvider && !address && (
        <button onClick={connect} disabled={connecting}>{connecting ? 'Connecting…' : 'Connect Wallet'}</button>
      )}
      {hasProvider && address && (
        <>
          <span>Connected: <span style={{ fontFamily: 'monospace' }}>{address}</span></span>
          {!isCorrectNetwork ? (
            <button onClick={switchToDesired}>Switch to Polygon</button>
          ) : (
            <span style={{ color: '#2a7' }}>Polygon</span>
          )}
        </>
      )}
      {error && <span style={{ color: 'crimson' }}>{error}</span>}
    </div>
  );
}
