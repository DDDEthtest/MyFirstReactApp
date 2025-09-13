import { BrowserProvider, Contract, parseEther } from 'ethers';

const MARKETPLACE_ABI = [
  'function listings(uint256) view returns (tuple(address artist,address currency,uint256 price,uint64 maxSupply,uint64 totalSold,uint64 start,uint64 end,uint32 maxPerWallet,uint64 defaultAssetId,bytes32 merkleRoot,bool active))',
  'function buy(uint256 listingId, uint256 qty, address recipient) payable',
];

export async function getSignerAndContracts() {
  const eth = (window as any)?.ethereum;
  if (!eth?.request) throw new Error('No wallet provider found');
  const provider = new BrowserProvider(eth);
  const signer = await provider.getSigner();
  const marketplaceAddr = String(process.env.REACT_APP_MARKETPLACE_ADDRESS || '');
  if (!marketplaceAddr) throw new Error('Missing REACT_APP_MARKETPLACE_ADDRESS');
  const marketplace = new Contract(marketplaceAddr, MARKETPLACE_ABI, signer);
  return { signer, marketplace };
}

export async function buyOne(listingId: bigint, priceMatic: string, recipient?: string) {
  const { signer, marketplace } = await getSignerAndContracts();
  const to = recipient || await signer.getAddress();
  const value = parseEther(priceMatic);
  const tx = await marketplace.buy(listingId, 1n, to, { value });
  return tx.wait();
}

