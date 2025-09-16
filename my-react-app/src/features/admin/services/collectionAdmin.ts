import { ethers } from 'ethers';

const COLLECTION_ABI = [
  'function ASSET_MANAGER_ROLE() view returns (bytes32)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)'
];

async function getSignerAndCollection() {
  const eth = (window as any)?.ethereum;
  if (!eth?.request) throw new Error('No wallet provider found');
  let provider = new ethers.BrowserProvider(eth);
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
    provider = new ethers.BrowserProvider(eth);
  }
  const signer = await provider.getSigner();
  const addr = String(process.env.REACT_APP_COLLECTION_ADDRESS || '');
  if (!addr) throw new Error('Missing REACT_APP_COLLECTION_ADDRESS');
  const collection = new ethers.Contract(addr, COLLECTION_ABI, signer);
  return { signer, collection };
}

export async function grantAssetManagerRole(artistWallet: string) {
  if (!artistWallet) throw new Error('artistWallet is required');
  const { collection } = await getSignerAndCollection();
  const role: string = await collection.ASSET_MANAGER_ROLE();
  const adminRole: string = await collection.getRoleAdmin(role);
  const caller: string = await collection.getAddress().then(() => (collection.runner as any)?.address).catch(async () => (await (await (collection as any).runner?.getAddress?.()) || ''));
  // Fallback to signer address if above fails
  const providerSignerAddr = await (collection.runner as any)?.provider?.getSigner?.()?.getAddress?.()?.catch?.(() => undefined);
  const signerAddr = caller || providerSignerAddr || (await (await (new ethers.BrowserProvider((window as any).ethereum)).getSigner()).getAddress());
  const isAdmin: boolean = await collection.hasRole(adminRole, signerAddr);
  if (!isAdmin) {
    throw new Error(`Connected wallet is not authorized to grant roles. Missing admin role ${adminRole}. Use the contract admin to grant ASSET_MANAGER_ROLE.`);
  }
  const has: boolean = await collection.hasRole(role, artistWallet);
  if (has) return { txHash: null, alreadyGranted: true };
  const tx = await collection.grantRole(role, artistWallet);
  const receipt = await tx.wait();
  const after: boolean = await collection.hasRole(role, artistWallet);
  if (!after) throw new Error('Role grant did not take effect');
  return { txHash: receipt?.hash ?? tx.hash ?? null, alreadyGranted: false };
}
