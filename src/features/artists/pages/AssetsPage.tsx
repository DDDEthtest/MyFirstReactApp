import React from 'react';
import Table from '../../../shared/components/Table';

type AssetRow = {
  tokenId: string;
  name: string;
};

const mockData: AssetRow[] = [
  { tokenId: '1', name: 'Example NFT #1' },
  { tokenId: '2', name: 'Example NFT #2' },
];

const AssetsPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold">Your Assets</h2>
      <div className="mt-4">
        <Table
          columns={[
            { key: 'tokenId', header: 'Token ID' },
            { key: 'name', header: 'Name' },
          ]}
          data={mockData}
        />
      </div>
    </div>
  );
};

export default AssetsPage;

