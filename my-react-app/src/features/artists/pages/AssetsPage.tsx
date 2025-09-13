import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '../../../shared/hooks/useWallet';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../shared/lib/firebase';
import { BrowserProvider, Contract, Interface, ZeroAddress, parseEther, keccak256, toUtf8Bytes } from 'ethers';
import { ipfsClient } from '../services/ipfsClient';

type Listing = {
  id: string;
  Composite?: string;
  status?: string;
  ['artist-wallet']?: string;
  ['artist-name']?: string;
  eyes?: string;
  head?: string;
  upper?: string;
  bottom?: string;
  hat?: string;
  left_accessory?: string;
  right_accessory?: string;
  background?: string;
  tokenURI?: string;
};

function toGateway(uri?: string) {
  if (!uri) return '';
  const cid = uri.startsWith('ipfs://') ? uri.slice('ipfs://'.length) : uri;
  return `https://ipfs.filebase.io/ipfs/${cid}`;
}

const thumbStyle: React.CSSProperties = {
  width: '100%',
  height: 120,
  objectFit: 'cover',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
};

const AssetsPage: React.FC = () => {
  const { address, connected } = useWallet();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number>(0);
  // Per-item listing form state for approved items
  const [formState, setFormState] = useState<Record<string, { maxSupply?: string; price?: string }>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const updateForm = (id: string, patch: Partial<{ maxSupply: string; price: string }>) => {
    setFormState((s) => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }));
  };

  const normalized = useMemo(() => (address || '').toString(), [address]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!normalized) { setItems([]); return; }
      try {
        setLoading(true); setError(null);
        const col = collection(db, 'NFT-listings');
        // Query by exact wallet (case-sensitive). If you decide to lowercase in DB,
        // adjust here accordingly.
        const q = query(col, where('artist-wallet', '==', normalized));
        const snap = await getDocs(q);
        const got: Listing[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        if (!cancelled) setItems(got);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [normalized]);

  if (!connected) {
    return <div style={{ padding: 16 }}>Connect your wallet to view your submissions.</div>;
  }

  if (loading) return <div style={{ padding: 16 }}>Loading your submissions�?�</div>;
  if (error) return <div style={{ padding: 16, color: 'crimson' }}>Error: {error}</div>;

  if (!items || items.length === 0) {
    return <div style={{ padding: 16 }}>no NFT submissions found for this wallet</div>;
  }

  const sel = items[Math.min(selected, items.length - 1)];

  // Minimal ABIs
  const MARKETPLACE_ABI = [
    'event ListingCreated(uint256 indexed listingId, (address artist,address currency,uint256 price,uint64 maxSupply,uint64 totalSold,uint64 start,uint64 end,uint32 maxPerWallet,uint64 defaultAssetId,bytes32 merkleRoot,bool active) data)',
    'function createListing((address artist,address currency,uint256 price,uint64 maxSupply,uint64 totalSold,uint64 start,uint64 end,uint32 maxPerWallet,uint64 defaultAssetId,bytes32 merkleRoot,bool active) in_) returns (uint256 listingId)'
  ];
  const COLLECTION_ABI = [
    'function assetExists(uint256 assetId) view returns (bool)',
    'function registerAsset(uint256 assetId, string uri)'
  ];

  const listForMinting = async (it: Listing) => {
    const fs = formState[it.id] || {};
    const maxSupply = Number(fs.maxSupply);
    const priceStr = fs.price || '0';
    if (!Number.isFinite(maxSupply) || maxSupply <= 0) { alert('Please enter Max Supply'); return; }
    let priceWei: bigint;
    try { priceWei = parseEther(String(priceStr)); } catch { alert('Invalid price'); return; }
    try {
      setPending((p) => ({ ...p, [it.id]: true }));

      // Provider/signer
      const eth = (window as any)?.ethereum;
      if (!eth?.request) throw new Error('No wallet provider found');
      const provider = new BrowserProvider(eth);
      const signer = await provider.getSigner();
      const myAddr = await signer.getAddress();

      const collectionAddr = String(process.env.REACT_APP_COLLECTION_ADDRESS || '');
      const marketplaceAddr = String(process.env.REACT_APP_MARKETPLACE_ADDRESS || '');
      if (!collectionAddr || !marketplaceAddr) throw new Error('Missing REACT_APP_COLLECTION_ADDRESS or MARKETPLACE_ADDRESS');

      // Ensure wallet is on the target chain (e.g., Polygon 137)
      const targetId = Number(process.env.REACT_APP_CHAIN_ID || '137');
      const targetHex = '0x' + targetId.toString(16);
      let net = await provider.getNetwork();
      if (Number(net.chainId) !== targetId) {
        try {
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902) {
            await eth.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: targetHex,
                chainName: process.env.REACT_APP_NETWORK_NAME || 'Polygon',
                rpcUrls: ['https://polygon-rpc.com'],
                nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
                blockExplorerUrls: [process.env.REACT_APP_BLOCK_EXPLORER || 'https://polygonscan.com']
              }]
            });
          } else {
            throw switchErr;
          }
        }
        net = await provider.getNetwork();
      }

      // Sanity: ensure addresses point to real contracts on this network
      net = await provider.getNetwork();
      const codeC = await provider.getCode(collectionAddr);
      const codeM = await provider.getCode(marketplaceAddr);
      if (codeC === '0x' || codeM === '0x') {
        throw new Error(`Configured addresses not contracts on chain ${net.chainId}.\nCollection=${collectionAddr} code=${codeC}\nMarketplace=${marketplaceAddr} code=${codeM}`);
      }

      const collection = new Contract(collectionAddr, COLLECTION_ABI, signer);
      const marketplace = new Contract(marketplaceAddr, MARKETPLACE_ABI, signer);

      // Determine assetId deterministically from doc id, constrained to uint64
      const hashBig = BigInt(keccak256(toUtf8Bytes(it.id)));
      const assetId = BigInt.asUintN(64, hashBig);

      // Ensure tokenURI exists; if not, build one from Firestore fields
      let tokenURI = it.tokenURI || '';
      if (!tokenURI) {
        const meta = {
          name: it['artist-name'] ? `${it['artist-name']} – ${it.id}` : it.id,
          image: it.Composite || '',
          assets: [
            { type: 'image', uri: it.Composite || '', label: 'Composite' },
            { type: 'image', uri: it.background || it.Composite || '', label: 'background' },
            { type: 'image', uri: it.bottom || it.Composite || '', label: 'bottom' },
            { type: 'image', uri: it.eyes || it.Composite || '', label: 'eyes' },
            { type: 'image', uri: it.hat || it.Composite || '', label: 'hat' },
            { type: 'image', uri: it.head || it.Composite || '', label: 'head' },
            { type: 'image', uri: it.left_accessory || it.Composite || '', label: 'left_accessory' },
            { type: 'image', uri: it.right_accessory || it.Composite || '', label: 'right_accessory' },
            { type: 'image', uri: it.upper || it.Composite || '', label: 'upper' },
          ],
          attributes: [ it['artist-name'] ? { trait_type: 'artist-name', value: it['artist-name'] } : undefined ].filter(Boolean),
        } as any;
        const { uri } = await ipfsClient.uploadJSON(meta);
        tokenURI = uri;
      }

      // Register the asset if not yet
      const exists: boolean = await collection.assetExists(assetId);
      // Optional: verify role to surface clearer error messages in production
      if (!exists) {
        try {
          const role = await collection.ASSET_MANAGER_ROLE();
          const hasRole = await collection.hasRole?.(role, myAddr).catch(() => undefined);
          if (hasRole === false) {
            throw new Error('Wallet lacks ASSET_MANAGER_ROLE on collection');
          }
        } catch (_) { /* ignore if contract doesn\'t expose hasRole in ABI */ }
      }
      if (!exists) {
        await (await collection.registerAsset(assetId, tokenURI)).wait();
      }

      const zero = ZeroAddress;
      const data = {
        artist: it['artist-wallet'] || myAddr,
        currency: zero,
        price: priceWei,
        maxSupply: BigInt(maxSupply),
        totalSold: 0n,
        start: 0n,
        end: 0n,
        maxPerWallet: 0,
        defaultAssetId: assetId,
        merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
        active: true,
      } as any;

      const tx = await marketplace.createListing(data);
      const receipt = await tx.wait();

      // Parse ListingCreated listingId
      let listingId: string | undefined;
      try {
        const iface = new Interface(MARKETPLACE_ABI);
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === 'ListingCreated') {
              listingId = (parsed.args[0] as bigint).toString();
              break;
            }
          } catch {}
        }
      } catch {}

      // Update Firestore doc
      const ref = doc(db, 'NFT-listings', it.id);
      await updateDoc(ref, {
        status: 'listed',
        priceMatic: String(priceStr),
        maxSupply,
        assetId: assetId.toString(),
        tokenURI,
        listingId: listingId || null,
      });

      alert(`Listed successfully${listingId ? ' (ID ' + listingId + ')' : ''}`);
      // Refresh local state
      setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, status: 'listed' } : x));
    } catch (e: any) {
      console.error('List for minting failed', e);
      const msg = e?.shortMessage || e?.reason || e?.message || String(e);
      alert('Listing failed: ' + msg + '\nNote: you must have ASSET_MANAGER_ROLE to register assets.');
    } finally {
      setPending((p) => ({ ...p, [it.id]: false }));
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
      {/* Left: vertical carousel of submissions */}
      <div style={{ height: 760, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Your Submissions</div>
        {items.map((it, idx) => (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, alignItems: 'center', padding: '8px 6px', borderTop: '1px solid #f3f4f6' }}>
            <img src={toGateway(it.Composite)} alt={`listing-${idx}`} style={thumbStyle} onClick={() => setSelected(idx)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Status: {it.status || '—'}</div>

              {it.status === 'approved' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'center' }}>
                    <span>Supply:</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="Max Supply"
                      value={formState[it.id]?.maxSupply ?? ''}
                      onChange={(e) => updateForm(it.id, { maxSupply: e.target.value })}
                      style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 8, alignItems: 'center' }}>
                    <span>Price (MATIC):</span>
                    <input
                      type="number"
                      min={0}
                      step="0.0001"
                      placeholder="Price (MATIC)"
                      value={formState[it.id]?.price ?? ''}
                      onChange={(e) => updateForm(it.id, { price: e.target.value })}
                      style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, width: '100%' }}
                    />
                  </div>
                </>
              )}

              {it.status === 'active' && (
                <button className="btn" onClick={() => alert('Listing to blockchain not implemented yet')}>List into the Blockchain</button>
              )}

              {it.status === 'approved' && (() => {
                const fs = formState[it.id] || {};
                const canList = Number(fs.maxSupply) > 0 && Number(fs.price) >= 0;
                return (
                  <button
                    className="btn secondary"
                    disabled={!canList || !!pending[it.id]}
                    onClick={() => listForMinting(it)}
                  >
                    {pending[it.id] ? 'Listing…' : 'List for minting'}
                  </button>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Right: selected preview */}
      <div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Preview</h3>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff' }}>
          <img src={toGateway(sel?.Composite)} alt="selected" style={{ width: '100%', maxWidth: 520, borderRadius: 12, border: '1px solid #e5e7eb' }} />
          <div style={{ marginTop: 12, fontSize: 14 }}>
            <div><strong>ID:</strong> {sel?.id}</div>
            <div><strong>Status:</strong> {sel?.status || '�?"'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsPage;
