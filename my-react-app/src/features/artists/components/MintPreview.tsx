import React from 'react';
import { MultiAssetMetadata } from '../services/metadata';

type Props = {
  metadata: MultiAssetMetadata | null;
};

export const MintPreview: React.FC<Props> = ({ metadata }) => {
  if (!metadata) return null;
  const src = metadata.image?.startsWith('ipfs://')
    ? metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')
    : metadata.image;
  return (
    <div className="preview">
      <h4 style={{ fontWeight: 600 }}>Preview</h4>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Name</div>
        <div>{metadata.name}</div>
      </div>
      {metadata.description && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Description</div>
          <div>{metadata.description}</div>
        </div>
      )}
      {src && (
        <div style={{ marginTop: 8 }}>
          <img src={src} alt={metadata.name} />
        </div>
      )}
    </div>
  );
};

export default MintPreview;
