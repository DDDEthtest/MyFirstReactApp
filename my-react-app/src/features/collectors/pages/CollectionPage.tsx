import React, { useEffect, useState } from 'react';
import { useWallet } from '../../../shared/hooks/useWallet';

type OwnedNft = { id: string; name?: string; image?: string; metadata?: any };

function makeCandidates(u?: string) {
  if (!u) return [] as string[];
  const gateways = [
    'https://ipfs.filebase.io/ipfs/',
    'https://nftstorage.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://dweb.link/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.io/ipfs/',
  ];
  const list: string[] = [];
  if (u.startsWith('ipfs://')) {
    let p = u.replace('ipfs://', '');
    if (p.startsWith('ipfs/')) p = p.slice(5);
    for (const g of gateways) list.push(g + p);
  } else if (/^https?:\/\//i.test(u) && /\/ipfs\//i.test(u)) {
    const after = u.split(/\/ipfs\//i)[1];
    if (after) for (const g of gateways) list.push(g + after.replace(/^ipfs\//i, ''));
    list.push(u);
  } else {
    list.push(u);
  }
  return Array.from(new Set(list));
}

const MultiGatewayImg: React.FC<{ uri?: string; alt?: string }>=({uri,alt})=>{
  const [idx,setIdx]=useState(0);
  const [cands,setCands]=useState<string[]>(()=>makeCandidates(uri));
  useEffect(()=>{ setCands(makeCandidates(uri)); setIdx(0); },[uri]);
  if(!cands.length) return null;
  const src=cands[Math.min(idx,cands.length-1)];
  return <img src={src} alt={alt} onError={()=>setIdx(i=>Math.min(i+1,cands.length-1))} referrerPolicy="no-referrer"/>;
};

async function fetchOwnedAll({ apiKey, owner }: { apiKey?: string; owner: string; }) {
  const key = apiKey || (process.env.REACT_APP_ALCHEMY_API_KEY as string);
  if (!key) throw new Error('Missing REACT_APP_ALCHEMY_API_KEY for collection');
  const base = `https://polygon-mainnet.g.alchemy.com/nft/v3/${key}`;
  const params = new URLSearchParams({ owner, withMetadata: 'true' });
  const url = `${base}/getNFTsForOwner?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alchemy getNFTsForOwner ${res.status}`);
  const data = await res.json();
  const out: OwnedNft[] = (data?.ownedNfts || []).map((n: any) => ({
    id: n?.tokenId || n?.id?.tokenId || Math.random().toString(36).slice(2),
    name: n?.title || n?.raw?.metadata?.name,
    image: n?.image?.cachedUrl || n?.image?.originalUrl || n?.raw?.metadata?.image || n?.media?.[0]?.gateway,
    metadata: n?.raw?.metadata || n?.metadata,
  }));
  return out;
}

export default function CollectionPage(){
  const { connected, address, connect } = useWallet();
  const [items,setItems]=useState<OwnedNft[]>([]);
  const [err,setErr]=useState<string|null>(null);

  useEffect(()=>{
    let cancel=false;
    (async()=>{
      if(!connected||!address) return;
      try{
        setErr(null);
        const list=await fetchOwnedAll({ owner: address });
        if(!cancel) setItems(list);
      }catch(e:any){ if(!cancel) setErr(e?.message||String(e)); }
    })();
    return ()=>{ cancel=true };
  },[connected,address]);

  if(!connected){
    return (<div><button className="btn" onClick={connect}>Connect Wallet</button></div>);
  }
  if(!process.env.REACT_APP_ALCHEMY_API_KEY){
    return <div style={{color:'#b91c1c'}}>Missing REACT_APP_ALCHEMY_API_KEY.</div>;
  }

  return (
    <div>
      <h2 className="explore-title">My NFTs</h2>
      {err && <div style={{ color: '#b91c1c' }}>Error: {err}</div>}
      <div className="explore-grid tiles">
        {items.map(n=> (
          <div key={n.id} className="explore-card tile">
            <div className="explore-thumb">
              <MultiGatewayImg uri={n.image || n.metadata?.image} alt={n.name || String(n.id)} />
            </div>
            <div className="explore-meta">
              <div className="explore-name">{n.name || `Token #${n.id}`}</div>
            </div>
          </div>
        ))}
      </div>
      {items.length===0 && (<div style={{ color: '#6b7280', marginTop: 8 }}>No NFTs found for this wallet.</div>)}
    </div>
  );
}
