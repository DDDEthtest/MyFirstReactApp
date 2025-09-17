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

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const FlattenedThumb: React.FC<{ uri?: string; caption?: string }>=({uri, caption})=>{
  const [dataUrl,setDataUrl]=useState<string|undefined>();
  const cands = React.useMemo(()=>makeCandidates(uri),[uri]);
  useEffect(()=>{
    let cancel=false;
    (async()=>{
      for(let i=0;i<cands.length;i++){
        try{
          const img=await loadImage(cands[i]);
          const W=800, H=1200; // portrait similar to card ratio
          const canvas=document.createElement('canvas');
          canvas.width=W; canvas.height=H;
          const ctx=canvas.getContext('2d')!;
          ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
          const r=Math.min(W/img.width, H/img.height);
          const w=Math.round(img.width*r); const h=Math.round(img.height*r);
          const x=Math.round((W-w)/2); const y=Math.round((H-h)/2);
          ctx.drawImage(img,x,y,w,h);
          if(caption){
            // Draw caption only (transparent background), centered and a bit above the bottom
            const y = H - 110; // move a little up from bottom
            ctx.font='700 56px Roboto, system-ui, -apple-system, Segoe UI, Helvetica, Arial';
            ctx.textAlign='center';
            ctx.textBaseline='middle';
            // subtle outline for readability on mixed backgrounds
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.strokeText(caption, W/2, y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(caption, W/2, y);
          }
          const url=canvas.toDataURL('image/png');
          if(!cancel) setDataUrl(url);
          return;
        }catch{ /* try next gateway */ }
      }
    })();
    return ()=>{ cancel=true };
  },[cands, caption]);
  return dataUrl
    ? <img src={dataUrl} alt={caption} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain' }} />
    : <MultiGatewayImg uri={uri} alt={caption} />;
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
  const out: OwnedNft[] = (data?.ownedNfts || []).map((n: any) => {
    const rawId = n?.tokenId || n?.id?.tokenId || 0;
    let decId = String(rawId);
    try { decId = BigInt(rawId).toString(10); } catch {}
    return {
      id: decId,
      name: n?.title || n?.raw?.metadata?.name,
      image: n?.image?.cachedUrl || n?.image?.originalUrl || n?.raw?.metadata?.image || n?.media?.[0]?.gateway,
      metadata: n?.raw?.metadata || n?.metadata,
    };
  });
  return out;
}

async function fetchOwnedByContract({ apiKey, owner, contract }: { apiKey?: string; owner: string; contract: string; }) {
  const key = apiKey || (process.env.REACT_APP_ALCHEMY_API_KEY as string);
  if (!key) throw new Error('Missing REACT_APP_ALCHEMY_API_KEY for collection');
  const base = `https://polygon-mainnet.g.alchemy.com/nft/v3/${key}`;
  const params = new URLSearchParams({ owner, withMetadata: 'true' });
  if (contract) params.append('contractAddresses[]', contract);
  const url = `${base}/getNFTsForOwner?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alchemy getNFTsForOwner ${res.status}`);
  const data = await res.json();
  const out: OwnedNft[] = (data?.ownedNfts || []).map((n: any) => {
    const rawId = n?.tokenId || n?.id?.tokenId || 0;
    let decId = String(rawId);
    try { decId = BigInt(rawId).toString(10); } catch {}
    return {
      id: decId,
      name: n?.title || n?.raw?.metadata?.name,
      image: n?.image?.cachedUrl || n?.image?.originalUrl || n?.raw?.metadata?.image || n?.media?.[0]?.gateway,
      metadata: n?.raw?.metadata || n?.metadata,
    };
  });
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
        const contract = String(process.env.REACT_APP_COLLECTION_ADDRESS || '').trim();
        const list = contract
          ? await fetchOwnedByContract({ owner: address, contract })
          : await fetchOwnedAll({ owner: address });
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
              <FlattenedThumb uri={n.image || n.metadata?.image} caption={(n.name || 'Token') + (n.id ? ` #${n.id}` : '')} />
            </div>
            <div className="explore-meta">
              <div className="explore-name">&nbsp;</div>
            </div>
          </div>
        ))}
      </div>
      {items.length===0 && (<div style={{ color: '#6b7280', marginTop: 8 }}>No NFTs found for this wallet.</div>)}
    </div>
  );
}
