import { BrowserProvider, Contract, JsonRpcProvider, Interface, parseEther } from 'ethers';

const MARKETPLACE_ABI = [
  'function listings(uint256) view returns (tuple(address artist,address currency,uint256 price,uint64 maxSupply,uint64 totalSold,uint64 start,uint64 end,uint32 maxPerWallet,uint64 defaultAssetId,bytes32 merkleRoot,bool active))',
  'function buy(uint256 listingId, uint256 qty, address recipient) payable',
];

export async function getSignerAndContracts() {
  const eth = (window as any)?.ethereum;
  if (!eth?.request) throw new Error('No wallet provider found');
  let provider = new BrowserProvider(eth);
  // Ensure correct chain before proceeding
  const targetId = Number(process.env.REACT_APP_CHAIN_ID || '137');
  const targetHex = '0x' + targetId.toString(16);
  let net = await provider.getNetwork();
  if (Number(net.chainId) !== targetId) {
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: targetHex }] });
    } catch (e: any) {
      if (e?.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: targetHex,
            chainName: process.env.REACT_APP_NETWORK_NAME || 'Polygon',
            rpcUrls: ['https://polygon-rpc.com'],
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            blockExplorerUrls: [process.env.REACT_APP_BLOCK_EXPLORER || 'https://polygonscan.com']
          }]
        });
      } else {
        throw e;
      }
    }
    await new Promise((r) => setTimeout(r, 300));
    provider = new BrowserProvider(eth);
    net = await provider.getNetwork();
  }
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

// Buy 1 and parse the collection's Minted(tokenId,to,listingId) event from the receipt
export async function buyOneReturnTokenIds(listingId: bigint, priceMatic: string, recipient?: string) {
  const { signer, marketplace } = await getSignerAndContracts();
  const to = recipient || await signer.getAddress();
  const value = parseEther(priceMatic);
  const tx = await marketplace.buy(listingId, 1n, to, { value });
  const receipt = await tx.wait();

  const collectionAddr = String(process.env.REACT_APP_COLLECTION_ADDRESS || '').toLowerCase();
  const iface = new Interface(['event Minted(uint256 indexed tokenId, address indexed to, uint256 indexed listingId)']);
  const tokenIds: string[] = [];
  for (const log of receipt.logs || []) {
    try {
      if (collectionAddr && String(log.address || '').toLowerCase() !== collectionAddr) continue;
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'Minted') {
        const tid = (parsed.args[0] as bigint).toString();
        tokenIds.push(tid);
      }
    } catch {}
  }
  return { receipt, tokenIds };
}

// Lightweight read-only access without requiring a wallet connection
export async function getMarketplaceRead() {
  const rpc = String(process.env.REACT_APP_RPC_URL || 'https://polygon-rpc.com');
  const provider = new JsonRpcProvider(rpc);
  const marketplaceAddr = String(process.env.REACT_APP_MARKETPLACE_ADDRESS || '');
  if (!marketplaceAddr) throw new Error('Missing REACT_APP_MARKETPLACE_ADDRESS');
  const marketplace = new Contract(marketplaceAddr, MARKETPLACE_ABI, provider);
  return { provider, marketplace };
}

export async function getListingTotalSold(listingId: bigint | string) {
  const { marketplace } = await getMarketplaceRead();
  const id = typeof listingId === 'string' ? BigInt(listingId) : listingId;
  const info = await marketplace.listings(id);
  // totalSold is uint64 in the ABI; return as number for UI
  try { return Number(info.totalSold); } catch { return 0; }
}
