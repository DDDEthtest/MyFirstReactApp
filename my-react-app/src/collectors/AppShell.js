import React, { useState } from 'react';
import NFTGallery from './NFTGallery';
import MashupBuilder from './MashupBuilder';
import AssetCarousel from './AssetCarousel';
import UserWalletConnect from './UserWalletConnect';
import FirestoreArtistContract from './FirestoreArtistContract';

function AppShell() {
  const [wallet, setWallet] = useState({ address: '', chainId: '', provider: null, isCorrectNetwork: false });

  // Layers shared with MashupBuilder
  const [layers, setLayers] = useState([]); // { image_name, image_path, enabled }
  const [selectedAssets, setSelectedAssets] = useState([]); // assets of currently selected NFT

  const toggleLayer = ({ image_name, image_path }) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.image_path === image_path);
      if (idx === -1) {
        return [...prev, { image_name, image_path, enabled: true }];
      }
      const next = prev.slice();
      next[idx] = { ...next[idx], enabled: !next[idx].enabled };
      return next;
    });
  };

  const activePaths = new Set(layers.filter((l) => l.enabled).map((l) => l.image_path));

  const moveLayer = (image_path, dir) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.image_path === image_path);
      if (idx === -1) return prev;
      // In MashupBuilder, later items render above earlier ones.
      // So 'up' should move toward a higher index (front),
      // and 'down' toward a lower index (back).
      const target = dir === 'up' ? idx + 1 : idx - 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };
  const moveLayerUp = (image_path) => moveLayer(image_path, 'up');
  const moveLayerDown = (image_path) => moveLayer(image_path, 'down');

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <UserWalletConnect onConnected={setWallet} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <FirestoreArtistContract walletAddress={wallet.address} />
      </div>
      {!wallet.address || !wallet.isCorrectNetwork ? (
        <div style={{ color: '#555', marginBottom: 12 }}>Connect your wallet and switch to Polygon to view wallet-based items.</div>
      ) : null}

      {/* Two-column layout: left gallery, right mashup */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 520px' }}>
          <NFTGallery
            address={wallet.address}
            chainId={wallet.chainId}
            provider={wallet.provider}
            onToggleAsset={toggleLayer}
            activeAssetPaths={activePaths}
            showCarousel={false}
            onAssetsChange={setSelectedAssets}
          />
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          <MashupBuilder layers={layers} width={600} height={600} background="#f8f8f8" />
        </div>
      </div>

      {/* Carousel below both columns */}
      {selectedAssets && selectedAssets.length > 0 && (
        <AssetCarousel
          assets={selectedAssets}
          onToggleAsset={toggleLayer}
          activeAssetPaths={activePaths}
          onMoveUp={moveLayerUp}
          onMoveDown={moveLayerDown}
        />
      )}
    </div>
  );
}

export default AppShell;

