// Placeholder storage client. Swap for Pinata/Web3.Storage/etc.

export type UploadResult = { cid: string; uri: string };

export const ipfsClient = {
  async uploadFile(_file: File): Promise<UploadResult> {
    // Simulate an upload
    const cid = 'bafybeigdyrdummycid';
    return { cid, uri: `ipfs://${cid}` };
  },

  async uploadJSON(obj: unknown): Promise<UploadResult> {
    const cid = 'bafybeigdyrdummyjsoncid';
    return { cid, uri: `ipfs://${cid}` };
  },
};

