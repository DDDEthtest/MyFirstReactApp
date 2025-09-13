import React from 'react';
import { MultiAssetMetadata } from '../services/metadata';

type Props = {
  metadata: MultiAssetMetadata | null;
};

export const MintPreview: React.FC<Props> = ({ metadata }) => {
  if (!metadata) return null;
  return (
    <div className="border rounded p-3">
      <h4 className="font-semibold">Preview</h4>
      <div className="mt-2">
        <div className="text-sm text-gray-600">Name</div>
        <div>{metadata.name}</div>
      </div>
      {metadata.description && (
        <div className="mt-2">
          <div className="text-sm text-gray-600">Description</div>
          <div>{metadata.description}</div>
        </div>
      )}
      {metadata.image && (
        <div className="mt-2">
          <img src={metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/')} alt={metadata.name} className="max-h-64" />
        </div>
      )}
    </div>
  );
};

export default MintPreview;

