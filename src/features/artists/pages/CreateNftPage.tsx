import React, { useState } from 'react';
import AssetForm, { AssetFormValues } from '../components/AssetForm';
import UploadWidget from '../components/UploadWidget';
import MintPreview from '../components/MintPreview';
import Button from '../../../shared/components/Button';
import { useWallet } from '../../../shared/hooks/useWallet';
import { useCreateMultiAssetNft } from '../hooks/useCreateMultiAssetNft';
import { MultiAssetMetadata } from '../services/metadata';

const CreateNftPage: React.FC = () => {
  const { address } = useWallet();
  const { mint } = useCreateMultiAssetNft();
  const [imageUri, setImageUri] = useState<string>('');
  const [details, setDetails] = useState<AssetFormValues>({ name: '' });
  const [preview, setPreview] = useState<MultiAssetMetadata | null>(null);

  const handleFile = async (file: File) => {
    // Just create a local object URL for preview; upload handled in hook during mint
    const url = URL.createObjectURL(file);
    setImageUri(url);
  };

  const buildPreview = () => {
    const meta: MultiAssetMetadata = {
      name: details.name || 'Untitled',
      description: details.description,
      image: imageUri || '',
      external_url: details.externalUrl,
    };
    setPreview(meta);
  };

  const handleMint = async () => {
    if (!address) return;
    if (!preview) buildPreview();
    const meta = preview || {
      name: details.name || 'Untitled',
      description: details.description,
      image: imageUri || '',
      external_url: details.externalUrl,
    };
    await mint({
      contractAddress: '0xC0FFEE0000000000000000000000000000000000',
      to: address,
      metadata: meta,
    });
    alert('Mint simulated');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Create Multi-Asset NFT</h2>
      <UploadWidget onFileSelected={handleFile} label="Upload Image" />
      <AssetForm onSubmit={(v) => { setDetails(v); buildPreview(); }} />
      <MintPreview metadata={preview} />
      <div>
        <Button onClick={handleMint}>Mint</Button>
      </div>
    </div>
  );
};

export default CreateNftPage;

