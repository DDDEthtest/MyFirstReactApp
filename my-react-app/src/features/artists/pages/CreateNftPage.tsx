import React, { useEffect, useMemo, useRef, useState } from 'react';
import AssetForm, { AssetFormValues } from '../components/AssetForm';
import Button from '../../../shared/components/Button';
import { useWallet } from '../../../shared/hooks/useWallet';
import { useCreateMultiAssetNft } from '../hooks/useCreateMultiAssetNft';
import { MultiAssetMetadata } from '../services/metadata';
import { ipfsClient } from '../services/ipfsClient';
import MultiAssetUploader, { AssetFileMap } from '../components/MultiAssetUploader';
import UploadStatus, { UploadItem } from '../components/UploadStatus';

const CreateNftPage: React.FC = () => {
  const { address } = useWallet();
  const { mint } = useCreateMultiAssetNft();
  const [details, setDetails] = useState<AssetFormValues>({ name: '' });
  const [preview, setPreview] = useState<MultiAssetMetadata | null>(null);
  const [assets, setAssets] = useState<AssetFileMap>({});
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [minting, setMinting] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Maintain object URLs for live preview layers
  useEffect(() => {
    const next: Record<string, string> = {};
    Object.entries(assets).forEach(([k, file]) => {
      if (file) next[k] = URL.createObjectURL(file as File);
    });
    // Revoke any stale URLs
    Object.entries(assetUrls).forEach(([k, url]) => {
      if (!next[k] || next[k] !== url) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    });
    setAssetUrls(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  const layerOrder = useMemo(() => (
    ['background','bottom','upper','head','hair','eyes','left_accessory','right_accessory','hat'] as (keyof AssetFileMap)[]
  ), []);

  // Track canvas size for proper scaling
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el as Element);
    window.addEventListener('resize', update);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const BG = { h: 1472, w: 1104 };
  const LYR = { h: 1200, w: 760 };
  const bgScale = canvasSize.h > 0 ? canvasSize.h / BG.h : 0;
  const layerDims = { w: Math.round(LYR.w * bgScale), h: Math.round(LYR.h * bgScale) };

  const buildPreview = () => {
    const meta: MultiAssetMetadata = {
      name: details.name || 'Untitled',
      description: details.description,
      image: '',
    };
    setPreview(meta);
  };

  const handleMint = async () => {
    try {
      setMinting(true);
      if (!address) return;
      if (!preview) buildPreview();
      // Validate mandatory assets exist
      const required: (keyof AssetFileMap)[] = ['eyes','head','upper','bottom','background'];
      const missing = required.filter((k) => !assets[k]);
      if (!details.name || !details.name.trim()) {
        alert('Please fill in the required field: name');
        return;
      }
      if (missing.length) {
        alert('Please upload required assets: ' + missing.join(', '));
        return;
      }
      // 1) Upload individual layer files to IPFS
      const uploadEntries: { key: string; cid: string; uri: string }[] = [];
      for (const [key, file] of Object.entries(assets)) {
        if (!file) continue;
        setUploads((u) => u.filter((x) => x.id !== `layer:${key}`).concat([{ id: `layer:${key}`, label: `Layer: ${key}`, stage: 'uploading' }]));
        const { cid, uri } = await ipfsClient.uploadFile(file as File);
        setUploads((u) => u.map((x) => x.id === `layer:${key}` ? { ...x, stage: 'done', cid, uri } : x));
        uploadEntries.push({ key, cid, uri });
      }

      // 2) Compose parent image on an off-screen canvas (1104x1472) and upload
      const compose = async (): Promise<Blob> => {
        const BG = { w: 1104, h: 1472 };
        const LYR = { w: 760, h: 1200 };
        const canvas = document.createElement('canvas');
        canvas.width = BG.w;
        canvas.height = BG.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D not supported');
      const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

      // Draw background first
      const bgUrl = assetUrls['background'];
      if (!bgUrl) throw new Error('Missing background in preview');
      const bgImg = await load(bgUrl);
      ctx.drawImage(bgImg, 0, 0, BG.w, BG.h);
      // Draw other layers centered with fixed intrinsic size scaled to BG canvas
      const x = Math.round((BG.w - LYR.w) / 2);
      const y = Math.round((BG.h - LYR.h) / 2);
      const order: (keyof AssetFileMap)[] = ['bottom','upper','head','hair','eyes','left_accessory','right_accessory','hat'];
      for (const k of order) {
        const u = assetUrls[k as string];
        if (!u) continue;
        const img = await load(u);
        ctx.drawImage(img, x, y, LYR.w, LYR.h);
      }
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to export PNG')), 'image/png');
      });
      };

      const parentBlob = await compose();
      setUploads((u) => u.filter((x) => x.id !== 'composite').concat([{ id: 'composite', label: 'Composite PNG', stage: 'uploading' }]));
      const { cid: parentCID, uri: parentURI } = await ipfsClient.uploadBlob(`${details.name || 'nft'}-composite.png`, parentBlob);
      setUploads((u) => u.map((x) => x.id === 'composite' ? { ...x, stage: 'done', cid: parentCID, uri: parentURI } : x));

      // 3) Build parent metadata and upload
      const meta: MultiAssetMetadata = {
        name: details.name || 'Untitled',
        description: details.description,
        image: parentURI,
        assets: uploadEntries.map((e) => ({ type: 'image' as const, uri: e.uri, label: e.key })),
      };
      setUploads((u) => u.filter((x) => x.id !== 'metadata').concat([{ id: 'metadata', label: 'Metadata JSON', stage: 'uploading' }]));
      const { cid: metaCID, uri: tokenURI } = await ipfsClient.uploadJSON(meta);
      setUploads((u) => u.map((x) => x.id === 'metadata' ? { ...x, stage: 'done', cid: metaCID, uri: tokenURI } : x));

      // 4) Simulated mint with real tokenURI (ready to wire to contract later)
      await mint({
        contractAddress: '0xC0FFEE0000000000000000000000000000000000',
        to: address,
        metadata: { ...meta, external_url: tokenURI },
      });
      alert('Uploaded to IPFS and mint simulated. Token URI: ' + tokenURI);
    } catch (e: any) {
      console.error('Mint flow failed', e);
      setUploads((u) => u.concat([{ id: `error:${Date.now()}`, label: 'Upload error', stage: 'error', error: e?.message || String(e) }]));
      alert('Upload/Mint failed: ' + (e?.message || String(e)));
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="artist-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="artist-heading" style={{ marginBottom: 0 }}>Create Multi-Asset NFT</h2>
        <Button onClick={handleMint} className="btn" disabled={minting}>{minting ? 'Minting…' : 'Mint'}</Button>
      </div>

      <div className="artist-three-col">
        <div className="artist-col-left">
          <div className="left-scroll">
            <div className="artist-section" style={{ marginTop: 0 }}>
              <h3 className="artist-heading" style={{ fontSize: 20 }}>Details - all (*) fields are required</h3>
              <AssetForm
                onChange={(v) => { setDetails(v); buildPreview(); }}
                showExternalUrl={false}
                showSubmit={false}
              />
            </div>
            <div className="artist-section">
              <h3 className="artist-heading" style={{ fontSize: 20 }}>Layered Assets</h3>
              <MultiAssetUploader value={assets} onChange={setAssets} />
            </div>
          </div>
          <div className="artist-section">
            {/* Removed metadata preview box per request */}
          </div>
        </div>
        <div className="artist-col-right">
          <div className="preview-canvas" ref={canvasRef}>
            {layerOrder.map((k, idx) => {
              const src = assetUrls[k as string];
              if (!src) return null;
              return (
                <div key={String(k)} className="preview-layer" style={{ zIndex: 10 + idx }}>
                  {k === 'background' ? (
                    <img src={src} alt="background" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <img
                      src={src}
                      alt={String(k)}
                      style={{ width: layerDims.w, height: layerDims.h, objectFit: 'contain' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="artist-col-status">
          <UploadStatus items={uploads} />
        </div>
      </div>
    </div>
  );
};

export default CreateNftPage;
