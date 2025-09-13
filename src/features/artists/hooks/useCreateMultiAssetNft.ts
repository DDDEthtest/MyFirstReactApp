import { useCallback } from 'react';
import { useAsync } from '../../../shared/hooks/useAsync';
import { polygonClient } from '../services/polygonClient';
import { ipfsClient } from '../services/ipfsClient';
import { buildMetadata, MultiAssetMetadata } from '../services/metadata';

export function useCreateMultiAssetNft() {
  const deployState = useAsync(polygonClient.deployMultiAssetNftCollection);

  const mint = useCallback(async (params: {
    contractAddress: string;
    to: string;
    metadata: MultiAssetMetadata;
  }) => {
    const normalized = buildMetadata(params.metadata);
    const { uri } = await ipfsClient.uploadJSON(normalized);
    return polygonClient.mintToCollection({
      contractAddress: params.contractAddress,
      to: params.to,
      tokenURI: uri,
    });
  }, []);

  return { deployState, mint };
}

